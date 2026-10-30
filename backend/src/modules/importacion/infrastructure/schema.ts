import { integer, jsonb, pgEnum, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { creadoEn, idUuid } from '../../../platform/columnas.js';
import { usuariosPanel } from '../../auth/infrastructure/schema.js';

export const tipoImportacion = pgEnum('tipo_importacion', ['productos', 'compatibilidades']);

export interface ErrorDeFila {
  fila: number;
  campo: string;
  motivo: string;
}

/** Cada planilla importada con su informe (FR-046, contracts/importacion-csv.md). */
export const importaciones = pgTable('importaciones', {
  id: idUuid(),
  tipo: tipoImportacion('tipo').notNull(),
  archivo: text('archivo').notNull(),
  filasTotal: integer('filas_total').notNull(),
  filasOk: integer('filas_ok').notNull(),
  filasError: integer('filas_error').notNull(),
  creados: integer('creados').notNull().default(0),
  actualizados: integer('actualizados').notNull().default(0),
  errores: jsonb('errores').$type<ErrorDeFila[]>().notNull(),
  usuarioId: uuid('usuario_id').references(() => usuariosPanel.id),
  creadoEn: creadoEn(),
});
