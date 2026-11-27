import { index, pgEnum, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { creadoEn, idUuid } from '../../../platform/columnas.js';
import { productos } from '../../catalogo/infrastructure/schema.js';

export const estadoConsultaCanje = pgEnum('estado_consulta_canje', ['pendiente', 'atendida']);

/**
 * Consultas por el canje de la batería usada (FR-004, clarify): no tienen precio online;
 * se guardan para el panel y se continúan por WhatsApp. Solo Mar del Plata.
 */
export const consultasCanje = pgTable(
  'consultas_canje',
  {
    id: idUuid(),
    nombre: text('nombre').notNull(),
    telefono: text('telefono').notNull(),
    bateriaUsada: text('bateria_usada'),
    auto: text('auto').notNull().default(''),
    localidad: text('localidad').notNull(),
    productoId: uuid('producto_id').references(() => productos.id, { onDelete: 'set null' }),
    estado: estadoConsultaCanje('estado').notNull().default('pendiente'),
    creadoEn: creadoEn(),
  },
  (t) => [index('consultas_canje_estado_idx').on(t.estado, t.creadoEn.desc())],
);
