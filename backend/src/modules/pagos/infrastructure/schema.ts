import { sql } from 'drizzle-orm';
import { index, jsonb, pgEnum, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { centavos, creadoEn, fecha, idUuid } from '../../../platform/columnas.js';
import { usuariosPanel } from '../../auth/infrastructure/schema.js';
import { medioPago, pedidos } from '../../pedidos/infrastructure/schema.js';

/** Cada intento de pago y cada confirmación manual (FR-030). */
export const pagos = pgTable(
  'pagos',
  {
    id: idUuid(),
    pedidoId: uuid('pedido_id')
      .notNull()
      .references(() => pedidos.id),
    medio: medioPago('medio').notNull(),
    // ID de pago de Mercado Pago; null en confirmaciones manuales.
    idExterno: text('id_externo'),
    estado: text('estado').notNull(),
    monto: centavos('monto').notNull(),
    // Obligatorio en transferencia y efectivo: quién confirmó (FR-028).
    confirmadoPor: uuid('confirmado_por').references(() => usuariosPanel.id),
    payload: jsonb('payload').$type<Record<string, unknown>>(),
    creadoEn: creadoEn(),
  },
  (t) => [
    // Idempotencia del webhook: el mismo pago de MP se registra una sola vez (FR-025).
    uniqueIndex('pagos_medio_externo_unico')
      .on(t.medio, t.idExterno)
      .where(sql`${t.idExterno} is not null`),
    index('pagos_pedido_idx').on(t.pedidoId),
  ],
);

export const tipoAlerta = pgEnum('tipo_alerta', ['monto_distinto', 'pago_sobre_cancelado']);

/** Situaciones que decide el administrador (FR-031). */
export const alertas = pgTable(
  'alertas',
  {
    id: idUuid(),
    pedidoId: uuid('pedido_id')
      .notNull()
      .references(() => pedidos.id),
    tipo: tipoAlerta('tipo').notNull(),
    detalle: jsonb('detalle').$type<Record<string, unknown>>().notNull(),
    resueltaEn: fecha('resuelta_en'),
    resueltaPor: uuid('resuelta_por').references(() => usuariosPanel.id),
    creadoEn: creadoEn(),
  },
  (t) => [index('alertas_abiertas_idx').on(t.resueltaEn)],
);
