import type { BaseDeDatos } from '../../src/platform/db.js';
import { marcas, medidas } from '../../src/modules/catalogo/infrastructure/schema.js';
import { slug } from '../../src/shared-kernel/slug.js';

export const MARCAS = ['Sermat', 'Herbo', 'Volta', 'Edna'] as const; // FR-002
export const MEDIDAS = ['12x65', '12x75', '12x90', '12x110', '12x160'] as const; // FR-003

/** Marcas y medidas iniciales (idempotente). */
export async function sembrarCatalogo(db: BaseDeDatos): Promise<void> {
  await db
    .insert(marcas)
    .values(MARCAS.map((nombre) => ({ nombre, slug: slug(nombre) })))
    .onConflictDoNothing();
  await db
    .insert(medidas)
    .values(MEDIDAS.map((codigo, i) => ({ codigo, orden: (i + 1) * 10 })))
    .onConflictDoNothing();
}
