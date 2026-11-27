import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { Almacenamiento } from '../shared-kernel/puertos.js';

/**
 * Las claves las genera el backend (`productos/<id>/<uuid>.webp`). Igual se validan: una clave
 * con `..` o caracteres raros nunca llega al disco ni al bucket.
 */
const CLAVE_VALIDA = /^[a-z0-9][a-z0-9/_-]*\.(webp|jpg|jpeg|png)$/;

export function claveValida(clave: string): boolean {
  return CLAVE_VALIDA.test(clave) && !clave.includes('..') && !clave.includes('//');
}

function exigirClave(clave: string): void {
  if (!claveValida(clave)) throw new Error(`Clave de archivo inválida: ${clave}`);
}

/** Cloudflare R2 (API S3), servido por un subdominio público (research R8). */
export class AlmacenamientoR2 implements Almacenamiento {
  private readonly s3: S3Client;

  constructor(
    cuenta: string,
    idClave: string,
    secreto: string,
    private readonly bucket: string,
    private readonly urlBase: string,
  ) {
    this.s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${cuenta}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: idClave, secretAccessKey: secreto },
    });
  }

  async guardar(clave: string, contenido: Buffer, tipoContenido: string): Promise<void> {
    exigirClave(clave);
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: clave,
        Body: contenido,
        ContentType: tipoContenido,
        // Cada foto tiene una clave única: se puede cachear para siempre.
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );
  }

  async borrar(clave: string): Promise<void> {
    exigirClave(clave);
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: clave }));
  }

  urlPublica(clave: string): string {
    return `${this.urlBase.replace(/\/$/, '')}/${clave}`;
  }
}

/** Desarrollo: archivos en una carpeta local, servidos por la API en /uploads. */
export class AlmacenamientoDisco implements Almacenamiento {
  private readonly raiz: string;

  constructor(
    carpeta: string,
    private readonly urlBase: string,
  ) {
    this.raiz = resolve(carpeta);
  }

  ruta(clave: string): string {
    exigirClave(clave);
    const ruta = resolve(join(this.raiz, clave));
    if (!ruta.startsWith(this.raiz + sep)) throw new Error(`Clave fuera de la carpeta: ${clave}`);
    return ruta;
  }

  async guardar(clave: string, contenido: Buffer): Promise<void> {
    const ruta = this.ruta(clave);
    await mkdir(dirname(ruta), { recursive: true });
    await writeFile(ruta, contenido);
  }

  async borrar(clave: string): Promise<void> {
    await rm(this.ruta(clave), { force: true });
  }

  leer(clave: string): Promise<Buffer> {
    return readFile(this.ruta(clave));
  }

  urlPublica(clave: string): string {
    return `${this.urlBase.replace(/\/$/, '')}/uploads/${clave}`;
  }
}

/** Tests: guarda en memoria para poder revisar qué se subió y qué se borró. */
export class AlmacenamientoMemoria implements Almacenamiento {
  readonly archivos = new Map<string, { contenido: Buffer; tipo: string }>();

  async guardar(clave: string, contenido: Buffer, tipoContenido: string): Promise<void> {
    exigirClave(clave);
    this.archivos.set(clave, { contenido, tipo: tipoContenido });
  }

  async borrar(clave: string): Promise<void> {
    this.archivos.delete(clave);
  }

  urlPublica(clave: string): string {
    return `http://fotos.test/${clave}`;
  }
}
