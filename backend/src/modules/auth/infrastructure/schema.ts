import { boolean, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { citext, creadoEn, fecha, idUuid } from '../../../platform/columnas.js';

/** Usuarios del panel. Hoy uno solo; preparado para más y para roles (FR-042). */
export const usuariosPanel = pgTable('usuarios_panel', {
  id: idUuid(),
  email: citext('email').notNull().unique(),
  rol: text('rol').notNull().default('admin'),
  activo: boolean('activo').notNull().default(true),
  creadoEn: creadoEn(),
});

/** Enlaces de ingreso: se guarda solo el hash del token; vencen a los 15 min y sirven una vez. */
export const enlacesIngreso = pgTable('enlaces_ingreso', {
  tokenHash: text('token_hash').primaryKey(),
  usuarioId: uuid('usuario_id')
    .notNull()
    .references(() => usuariosPanel.id, { onDelete: 'cascade' }),
  venceEn: fecha('vence_en').notNull(),
  usadoEn: fecha('usado_en'),
  creadoEn: creadoEn(),
});

/** Sesiones opacas (30 días), revocables al cerrar sesión (FR-041). */
export const sesiones = pgTable('sesiones', {
  idHash: text('id_hash').primaryKey(),
  usuarioId: uuid('usuario_id')
    .notNull()
    .references(() => usuariosPanel.id, { onDelete: 'cascade' }),
  venceEn: fecha('vence_en').notNull(),
  revocadaEn: fecha('revocada_en'),
  creadoEn: creadoEn(),
});
