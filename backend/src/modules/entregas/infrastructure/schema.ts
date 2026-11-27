import { sql } from 'drizzle-orm';
import { boolean, pgTable, text } from 'drizzle-orm/pg-core';
import { centavos, idUuid } from '../../../platform/columnas.js';

/** Zonas de colocación a domicilio con costo extra opcional (FR-017). */
export const zonasColocacion = pgTable('zonas_colocacion', {
  id: idUuid(),
  nombre: text('nombre').notNull().unique(),
  costoExtra: centavos('costo_extra')
    .notNull()
    .default(sql`0`),
  activa: boolean('activa').notNull().default(true),
});
