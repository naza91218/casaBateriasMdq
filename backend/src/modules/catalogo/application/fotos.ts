import { and, asc, count, eq, inArray, max, sql } from 'drizzle-orm';
import sharp from 'sharp';
import type { BaseDeDatos, Ejecutor, Transaccion } from '../../../platform/db.js';
import { uuidv7 } from '../../../platform/ids.js';
import { ErrorDeDominio, noEncontrado, validacion } from '../../../shared-kernel/errores.js';
import type { Almacenamiento } from '../../../shared-kernel/puertos.js';
import type { Outbox } from '../../notificaciones/application/outbox.js';
import { productoFotos, productos } from '../infrastructure/schema.js';

export const MAX_FOTOS = 10;
const LADO_MAXIMO = 1600;

export type OrigenFoto = 'marca' | 'propia';

export interface Foto {
  id: string;
  url: string;
  orden: number;
  origen: OrigenFoto;
}

/**
 * WebP de hasta 1600 px por lado. sharp descarta los metadatos (EXIF, ubicación GPS de las
 * fotos sacadas con el celular); `rotate()` aplica antes la orientación del EXIF.
 */
export async function normalizarFoto(original: Buffer): Promise<Buffer> {
  try {
    return await sharp(original, { limitInputPixels: 50_000_000 })
      .rotate()
      .resize({ width: LADO_MAXIMO, height: LADO_MAXIMO, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    throw validacion({
      archivo: 'El archivo no es una foto válida. Probá con una JPG, PNG o WebP',
    });
  }
}

/** Fotos de los productos (FR-045): subir desde el celular, ordenar y borrar. */
export class ServicioFotos {
  constructor(
    private readonly db: BaseDeDatos,
    private readonly almacenamiento: Almacenamiento,
    private readonly outbox: Outbox,
  ) {}

  async subir(productoId: string, original: Buffer, origen: OrigenFoto = 'propia'): Promise<Foto> {
    const contenido = await normalizarFoto(original);
    const clave = `productos/${productoId}/${uuidv7()}.webp`;
    // Primero el archivo: si la fila falla se borra; al revés quedaría una fila sin foto.
    await this.almacenamiento.guardar(clave, contenido, 'image/webp');
    try {
      return await this.db.transaction(async (tx) => {
        const producto = await this.bloquearProducto(tx, productoId);
        const [{ n, ultimo } = { n: 0, ultimo: null }] = await tx
          .select({ n: count(), ultimo: max(productoFotos.orden) })
          .from(productoFotos)
          .where(eq(productoFotos.productoId, productoId));
        if (n >= MAX_FOTOS) {
          throw new ErrorDeDominio(
            'regla_de_negocio',
            'DEMASIADAS_FOTOS',
            `Cada producto puede tener hasta ${MAX_FOTOS} fotos`,
          );
        }
        const [foto] = await tx
          .insert(productoFotos)
          .values({ productoId, clave, orden: (ultimo ?? -1) + 1, origen })
          .returning();
        await this.revalidarSiSeVe(tx, producto);
        if (!foto) throw new Error('No se guardó la foto');
        return this.aFoto(foto);
      });
    } catch (error) {
      await this.almacenamiento.borrar(clave).catch(() => {});
      throw error;
    }
  }

  /** `ids` es el orden nuevo y tiene que incluir todas las fotos del producto. */
  async ordenar(productoId: string, ids: string[]): Promise<Foto[]> {
    return this.db.transaction(async (tx) => {
      const producto = await this.bloquearProducto(tx, productoId);
      const actuales = await tx
        .select({ id: productoFotos.id })
        .from(productoFotos)
        .where(eq(productoFotos.productoId, productoId));
      const mismas =
        ids.length === actuales.length &&
        new Set(ids).size === ids.length &&
        actuales.every((f) => ids.includes(f.id));
      if (!mismas)
        throw validacion({
          ids: 'El orden tiene que incluir todas las fotos del producto, una vez cada una',
        });
      await this.renumerar(tx, productoId, ids);
      await this.revalidarSiSeVe(tx, producto);
      return this.deProducto(productoId, tx);
    });
  }

  async borrar(productoId: string, fotoId: string): Promise<Foto[]> {
    const { clave, restantes } = await this.db.transaction(async (tx) => {
      const producto = await this.bloquearProducto(tx, productoId);
      const fotos = await tx
        .select()
        .from(productoFotos)
        .where(eq(productoFotos.productoId, productoId))
        .orderBy(asc(productoFotos.orden));
      const foto = fotos.find((f) => f.id === fotoId);
      if (!foto) throw noEncontrado('No encontramos esa foto');
      if (producto.estado === 'activo' && fotos.length === 1) {
        throw new ErrorDeDominio(
          'regla_de_negocio',
          'ULTIMA_FOTO',
          'Es la única foto de un producto publicado. Subí otra antes o pausá el producto.',
        );
      }
      await tx.delete(productoFotos).where(eq(productoFotos.id, fotoId));
      await this.renumerar(
        tx,
        productoId,
        fotos.filter((f) => f.id !== fotoId).map((f) => f.id),
      );
      await this.revalidarSiSeVe(tx, producto);
      return { clave: foto.clave, restantes: await this.deProducto(productoId, tx) };
    });
    // Después del commit: si falla, queda un archivo huérfano, nunca una fila sin archivo.
    await this.almacenamiento.borrar(clave).catch(() => {});
    return restantes;
  }

  async deProducto(productoId: string, ej: Ejecutor = this.db): Promise<Foto[]> {
    return (await this.deProductos([productoId], ej)).get(productoId) ?? [];
  }

  async deProductos(ids: string[], ej: Ejecutor = this.db): Promise<Map<string, Foto[]>> {
    const resultado = new Map<string, Foto[]>();
    if (ids.length === 0) return resultado;
    const filas = await ej
      .select()
      .from(productoFotos)
      .where(inArray(productoFotos.productoId, ids))
      .orderBy(asc(productoFotos.productoId), asc(productoFotos.orden));
    for (const f of filas) {
      const lista = resultado.get(f.productoId) ?? [];
      lista.push(this.aFoto(f));
      resultado.set(f.productoId, lista);
    }
    return resultado;
  }

  /** Claves de archivo de un producto, para borrarlas cuando se elimina el producto. */
  async claves(productoId: string, ej: Ejecutor = this.db): Promise<string[]> {
    const filas = await ej
      .select({ clave: productoFotos.clave })
      .from(productoFotos)
      .where(eq(productoFotos.productoId, productoId));
    return filas.map((f) => f.clave);
  }

  async borrarArchivos(claves: string[]): Promise<void> {
    await Promise.all(claves.map((c) => this.almacenamiento.borrar(c).catch(() => {})));
  }

  private aFoto(f: typeof productoFotos.$inferSelect): Foto {
    return {
      id: f.id,
      url: this.almacenamiento.urlPublica(f.clave),
      orden: f.orden,
      origen: f.origen,
    };
  }

  private async bloquearProducto(tx: Transaccion, productoId: string) {
    const [p] = await tx
      .select({ id: productos.id, slug: productos.slug, estado: productos.estado })
      .from(productos)
      .where(and(eq(productos.id, productoId), sql`${productos.estado} <> 'archivado'`))
      .for('update');
    if (!p) throw noEncontrado('No encontramos ese producto');
    return p;
  }

  /**
   * (producto, orden) es único: primero se pasan a negativos y después a 0, 1, 2… para que
   * ningún paso intermedio choque.
   */
  private async renumerar(tx: Transaccion, productoId: string, ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await tx
      .update(productoFotos)
      .set({ orden: sql`-1 - ${productoFotos.orden}` })
      .where(eq(productoFotos.productoId, productoId));
    for (const [orden, id] of ids.entries()) {
      await tx.update(productoFotos).set({ orden }).where(eq(productoFotos.id, id));
    }
  }

  private async revalidarSiSeVe(
    tx: Transaccion,
    producto: { slug: string; estado: string },
  ): Promise<void> {
    if (producto.estado === 'activo')
      await this.outbox.revalidar(tx, ['catalogo', `producto:${producto.slug}`]);
  }
}
