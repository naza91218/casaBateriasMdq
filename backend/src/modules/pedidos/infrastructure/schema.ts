import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  numeric,
  pgEnum,
  pgSequence,
  pgTable,
  text,
  uuid,
} from 'drizzle-orm/pg-core';
import { actualizadoEn, centavos, creadoEn, fecha, idUuid } from '../../../platform/columnas.js';
import { productos } from '../../catalogo/infrastructure/schema.js';
import { zonasColocacion } from '../../entregas/infrastructure/schema.js';
import { ESTADOS } from '../domain/maquina-estados.js';

export const estadoPedido = pgEnum('estado_pedido', ESTADOS);
export const tipoEntrega = pgEnum('tipo_entrega', ['colocacion', 'retiro']);
export const medioPago = pgEnum('medio_pago', ['mercadopago', 'transferencia', 'efectivo']);

/** Número correlativo legible (#1001, #1002…) (FR-021). */
export const numeroPedidoSeq = pgSequence('pedidos_numero_seq', { startWith: 1001 });

export const pedidos = pgTable(
  'pedidos',
  {
    // También es el external_reference de Mercado Pago.
    id: idUuid(),
    numero: integer('numero')
      .notNull()
      .unique()
      .default(sql`nextval('pedidos_numero_seq')`),
    estado: estadoPedido('estado').notNull(),
    entrega: tipoEntrega('entrega').notNull(),
    zonaId: uuid('zona_id').references(() => zonasColocacion.id),
    medioPago: medioPago('medio_pago').notNull(),
    subtotal: centavos('subtotal').notNull(),
    descuento: centavos('descuento').notNull(),
    costoZona: centavos('costo_zona').notNull(),
    total: centavos('total').notNull(),
    descuentoPctAplicado: numeric('descuento_pct_aplicado', { precision: 5, scale: 2 }).notNull(),
    // 30 min (MP), 48 h (transferencia), null (efectivo: no vence).
    venceEn: fecha('vence_en'),
    creadoEn: creadoEn(),
    actualizadoEn: actualizadoEn(),
  },
  (t) => [
    check(
      'pedidos_zona_si_colocacion',
      sql`${t.entrega} <> 'colocacion' or ${t.zonaId} is not null`,
    ),
    check(
      'pedidos_efectivo_solo_retiro',
      sql`${t.medioPago} <> 'efectivo' or ${t.entrega} = 'retiro'`,
    ),
    index('pedidos_estado_vence_idx').on(t.estado, t.venceEn),
    index('pedidos_estado_creado_idx').on(t.estado, t.creadoEn.desc()),
  ],
);

export const pedidoItems = pgTable(
  'pedido_items',
  {
    id: idUuid(),
    pedidoId: uuid('pedido_id')
      .notNull()
      .references(() => pedidos.id, { onDelete: 'cascade' }),
    // El producto puede quedar archivado, nunca se borra si tiene pedidos (FR-071).
    productoId: uuid('producto_id')
      .notNull()
      .references(() => productos.id),
    nombreProducto: text('nombre_producto').notNull(),
    cantidad: integer('cantidad').notNull(),
    precioUnitario: centavos('precio_unitario').notNull(),
  },
  (t) => [
    check('pedido_items_cantidad_positiva', sql`${t.cantidad} > 0`),
    index('pedido_items_pedido_idx').on(t.pedidoId),
  ],
);

/** Auditoría de cada cambio de estado, incluidos los intentos rechazados (FR-033). */
export const pedidoEventos = pgTable(
  'pedido_eventos',
  {
    id: idUuid(),
    pedidoId: uuid('pedido_id')
      .notNull()
      .references(() => pedidos.id, { onDelete: 'cascade' }),
    de: estadoPedido('de'),
    a: estadoPedido('a').notNull(),
    actor: text('actor').notNull(),
    motivo: text('motivo').notNull().default(''),
    rechazado: boolean('rechazado').notNull().default(false),
    creadoEn: creadoEn(),
  },
  (t) => [index('pedido_eventos_pedido_idx').on(t.pedidoId)],
);
