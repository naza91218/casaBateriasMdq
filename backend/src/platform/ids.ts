import { randomBytes } from 'node:crypto';

/**
 * UUID v7 (ordenable por tiempo). PostgreSQL 17 no lo genera de fábrica, así que se crea en la app.
 */
export function uuidv7(ahora: number = Date.now()): string {
  const b = randomBytes(16);
  const ts = BigInt(ahora);
  for (let i = 0; i < 6; i++) {
    b[i] = Number((ts >> BigInt(8 * (5 - i))) & 0xffn);
  }
  b[6] = ((b[6] ?? 0) & 0x0f) | 0x70;
  b[8] = ((b[8] ?? 0) & 0x3f) | 0x80;
  const h = b.toString('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
