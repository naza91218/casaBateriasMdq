import { sql } from 'drizzle-orm';
import { check, index, pgTable, primaryKey, smallint, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { idUuid } from '../../../platform/columnas.js';
import { medidas } from '../../catalogo/infrastructure/schema.js';

/** Un auto y su rango de años. Motor null = cualquier motor (FR-009). */
export const vehiculos = pgTable(
  'vehiculos',
  {
    id: idUuid(),
    marca: text('marca').notNull(),
    marcaSlug: text('marca_slug').notNull(),
    modelo: text('modelo').notNull(),
    modeloSlug: text('modelo_slug').notNull(),
    anioDesde: smallint('anio_desde').notNull(),
    anioHasta: smallint('anio_hasta').notNull(),
    motor: text('motor'),
    fuente: text('fuente').notNull().default('manual'),
  },
  (t) => [
    check('vehiculos_rango_anios', sql`${t.anioHasta} >= ${t.anioDesde}`),
    uniqueIndex('vehiculos_unico').on(
      t.marcaSlug,
      t.modeloSlug,
      t.anioDesde,
      t.anioHasta,
      sql`coalesce(${t.motor}, '')`,
    ),
    index('vehiculos_marca_modelo_idx').on(t.marcaSlug, t.modeloSlug),
  ],
);

/** Medidas que lleva cada vehículo (compatibilidad por medida, D10). */
export const vehiculoMedidas = pgTable(
  'vehiculo_medidas',
  {
    vehiculoId: uuid('vehiculo_id')
      .notNull()
      .references(() => vehiculos.id, { onDelete: 'cascade' }),
    medida: text('medida')
      .notNull()
      .references(() => medidas.codigo),
  },
  (t) => [primaryKey({ columns: [t.vehiculoId, t.medida] }), index('vehiculo_medidas_medida_idx').on(t.medida)],
);
