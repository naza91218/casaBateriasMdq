import { index, integer, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { creadoEn, idUuid } from '../../../platform/columnas.js';
import { pedidos } from '../../pedidos/infrastructure/schema.js';

/**
 * Solicitudes del botón de arrepentimiento (FR-058, Ley 24.240 art. 34). Se guarda lo que
 * escribió el comprador; si el número corresponde a un pedido, queda vinculada.
 */
export const arrepentimientos = pgTable(
  'arrepentimientos',
  {
    id: idUuid(),
    pedidoId: uuid('pedido_id').references(() => pedidos.id, { onDelete: 'set null' }),
    numeroPedido: integer('numero_pedido').notNull(),
    nombre: text('nombre').notNull(),
    email: text('email').notNull(),
    codigo: text('codigo').notNull().unique(),
    creadoEn: creadoEn(),
  },
  (t) => [
    index('arrepentimientos_pedido_idx').on(t.pedidoId),
    index('arrepentimientos_creado_idx').on(t.creadoEn.desc()),
  ],
);
