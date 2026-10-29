import { index, integer, jsonb, pgEnum, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { creadoEn, fecha, idUuid } from '../../../platform/columnas.js';

export const canalOutbox = pgEnum('canal_outbox', ['mail', 'revalidacion']);
export const destinatarioOutbox = pgEnum('destinatario_outbox', ['comprador', 'admin', 'sistema']);
export const estadoOutbox = pgEnum('estado_outbox', ['pendiente', 'enviado', 'fallido']);

/**
 * Outbox transaccional (research R6). Se escribe en la misma transacción que el cambio que lo
 * origina y lo procesa el worker con reintentos. `clave` hace que cada evento salga una sola vez
 * (FR-040): para mails de un pedido es `evento:pedidoId:destinatario`.
 * `datos` NUNCA lleva el DNI (FR-038).
 */
export const outboxMensajes = pgTable(
  'outbox_mensajes',
  {
    id: idUuid(),
    clave: text('clave').notNull().unique(),
    canal: canalOutbox('canal').notNull(),
    evento: text('evento').notNull(),
    pedidoId: uuid('pedido_id'),
    destinatario: destinatarioOutbox('destinatario').notNull(),
    datos: jsonb('datos').$type<Record<string, unknown>>().notNull(),
    estado: estadoOutbox('estado').notNull().default('pendiente'),
    intentos: integer('intentos').notNull().default(0),
    proximoIntentoEn: fecha('proximo_intento_en').notNull().defaultNow(),
    ultimoError: text('ultimo_error'),
    enviadoEn: fecha('enviado_en'),
    creadoEn: creadoEn(),
  },
  (t) => [index('outbox_pendientes_idx').on(t.estado, t.proximoIntentoEn)],
);
