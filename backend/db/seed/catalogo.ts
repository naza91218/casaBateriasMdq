import { sql } from 'drizzle-orm';
import type { BaseDeDatos } from '../../src/platform/db.js';
import { marcas, medidas } from '../../src/modules/catalogo/infrastructure/schema.js';
import { slug } from '../../src/shared-kernel/slug.js';

export const MARCAS = ['Sermat', 'Herbo', 'Volta', 'Edna'] as const; // FR-002
/**
 * FR-003 pide al menos 12x65, 12x75, 12x90, 12x110 y 12x160; se suman las demás medidas
 * comerciales de 12 V que usan Sermat, Herbo y Volta, para que la carga inicial no las rechace.
 */
export const MEDIDAS = [
  '12x45',
  '12x50',
  '12x55',
  '12x60',
  '12x65',
  '12x70',
  '12x75',
  '12x80',
  '12x90',
  '12x100',
  '12x110',
  '12x120',
  '12x150',
  '12x160',
  '12x180',
  '12x200',
  '12x220',
] as const;

/** Marcas y medidas iniciales (idempotente). */
export async function sembrarCatalogo(db: BaseDeDatos): Promise<void> {
  await db
    .insert(marcas)
    .values(MARCAS.map((nombre) => ({ nombre, slug: slug(nombre) })))
    .onConflictDoNothing();
  await db
    .insert(medidas)
    .values(MEDIDAS.map((codigo, i) => ({ codigo, orden: (i + 1) * 10 })))
    .onConflictDoUpdate({ target: medidas.codigo, set: { orden: sql`excluded.orden` } });
}
