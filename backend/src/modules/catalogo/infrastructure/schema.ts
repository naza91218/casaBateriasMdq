import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { actualizadoEn, centavos, creadoEn, idUuid } from '../../../platform/columnas.js';

/** Lista cerrada de marcas: Sermat, Herbo, Volta, Edna (FR-002). */
export const marcas = pgTable('marcas', {
  id: idUuid(),
  nombre: text('nombre').notNull().unique(),
  slug: text('slug').notNull().unique(),
  activa: boolean('activa').notNull().default(true),
});

/** Medidas comerciales: 12x65, 12x75… Son el puente entre autos y productos (D10). */
export const medidas = pgTable('medidas', {
  codigo: text('codigo').primaryKey(),
  orden: integer('orden').notNull(),
});

export const gama = pgEnum('gama', ['economica', 'reforzada']);
export const estadoProducto = pgEnum('estado_producto', ['a_revisar', 'activo', 'pausado', 'archivado']);
export const origenFoto = pgEnum('origen_foto', ['marca', 'propia']);

export const productos = pgTable(
  'productos',
  {
    id: idUuid(),
    sku: text('sku').notNull().unique(),
    slug: text('slug').notNull().unique(),
    nombre: text('nombre').notNull(),
    marcaId: uuid('marca_id')
      .notNull()
      .references(() => marcas.id),
    medida: text('medida')
      .notNull()
      .references(() => medidas.codigo),
    amperajeAh: integer('amperaje_ah').notNull(),
    cca: integer('cca'),
    gama: gama('gama').notNull(),
    descripcion: text('descripcion').notNull().default(''),
    precioLista: centavos('precio_lista').notNull().default(sql`0`),
    stock: integer('stock').notNull().default(0),
    // Lo importado entra "a revisar" y no se ve hasta que el admin lo habilita (FR-070).
    estado: estadoProducto('estado').notNull().default('a_revisar'),
    fuente: text('fuente').notNull().default('manual'),
    creadoEn: creadoEn(),
    actualizadoEn: actualizadoEn(),
  },
  (t) => [
    check('productos_stock_no_negativo', sql`${t.stock} >= 0`), // FR-020, SC-003
    check('productos_amperaje_positivo', sql`${t.amperajeAh} > 0`),
    index('productos_estado_medida_idx').on(t.estado, t.medida),
    index('productos_estado_marca_gama_idx').on(t.estado, t.marcaId, t.gama),
  ],
);

export const productoFotos = pgTable(
  'producto_fotos',
  {
    id: idUuid(),
    productoId: uuid('producto_id')
      .notNull()
      .references(() => productos.id, { onDelete: 'cascade' }),
    clave: text('clave').notNull(),
    orden: integer('orden').notNull(),
    origen: origenFoto('origen').notNull().default('propia'),
  },
  (t) => [unique('producto_fotos_orden_unico').on(t.productoId, t.orden)],
);
