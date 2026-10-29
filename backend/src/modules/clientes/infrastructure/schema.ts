import { pgTable, smallint, text, uuid } from 'drizzle-orm/pg-core';
import { bytea, fecha } from '../../../platform/columnas.js';
import { pedidos } from '../../pedidos/infrastructure/schema.js';

/**
 * Datos del comprador de cada pedido. El DNI va cifrado con AES-256-GCM y solo se descifra
 * para el panel (FR-059). Se puede anonimizar sin perder el registro contable (FR-061).
 */
export const pedidoCompradores = pgTable('pedido_compradores', {
  pedidoId: uuid('pedido_id')
    .primaryKey()
    .references(() => pedidos.id, { onDelete: 'cascade' }),
  nombre: text('nombre').notNull(),
  dniCifrado: bytea('dni_cifrado').notNull(),
  dniClaveVersion: smallint('dni_clave_version').notNull(),
  telefono: text('telefono').notNull(),
  email: text('email').notNull(),
  calle: text('calle'),
  numero: text('numero'),
  referencias: text('referencias'),
  anonimizadoEn: fecha('anonimizado_en'),
});
