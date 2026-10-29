import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const ALGORITMO = 'aes-256-gcm';
const LARGO_IV = 12;
const LARGO_TAG = 16;

export interface Cifrador {
  cifrar(texto: string): { datos: Buffer; version: number };
  descifrar(datos: Buffer, version: number): string;
}

/**
 * Cifrado de campo para el DNI (constitución VI, FR-059). Formato: IV(12) | TAG(16) | texto.
 * Cada dato guarda la versión de clave con la que se cifró, para poder rotarla.
 */
export function crearCifrador(opciones: {
  claves: Record<number, Buffer>;
  versionActual: number;
}): Cifrador {
  for (const [version, clave] of Object.entries(opciones.claves)) {
    if (clave.length !== 32) {
      throw new Error(`La clave de cifrado v${version} tiene que tener 32 bytes`);
    }
  }
  const claveDe = (version: number): Buffer => {
    const clave = opciones.claves[version];
    if (!clave) throw new Error(`No hay clave de cifrado para la versión ${version}`);
    return clave;
  };
  claveDe(opciones.versionActual);

  return {
    cifrar(texto) {
      const iv = randomBytes(LARGO_IV);
      const cifra = createCipheriv(ALGORITMO, claveDe(opciones.versionActual), iv);
      const cuerpo = Buffer.concat([cifra.update(texto, 'utf8'), cifra.final()]);
      return {
        datos: Buffer.concat([iv, cifra.getAuthTag(), cuerpo]),
        version: opciones.versionActual,
      };
    },
    descifrar(datos, version) {
      const iv = datos.subarray(0, LARGO_IV);
      const tag = datos.subarray(LARGO_IV, LARGO_IV + LARGO_TAG);
      const cuerpo = datos.subarray(LARGO_IV + LARGO_TAG);
      const descifra = createDecipheriv(ALGORITMO, claveDe(version), iv);
      descifra.setAuthTag(tag);
      return Buffer.concat([descifra.update(cuerpo), descifra.final()]).toString('utf8');
    },
  };
}

/** 32 bytes aleatorios en base64url: enlaces de ingreso, sesiones, seguimiento de pedidos. */
export function tokenAleatorio(): string {
  return randomBytes(32).toString('base64url');
}

/** Solo se guarda el hash de cada token; el token en claro viaja una sola vez. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
