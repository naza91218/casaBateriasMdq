import { sql } from 'drizzle-orm';
import { check, integer, jsonb, numeric, pgTable, smallint, text } from 'drizzle-orm/pg-core';
import { actualizadoEn } from '../../../platform/columnas.js';

export interface FranjaHoraria {
  dias: string; // "Lunes a viernes"
  desde: string; // "08:30"
  hasta: string; // "18:00"
}

/** Fila única con la configuración editable por el administrador (FR-047). */
export const configuracion = pgTable(
  'configuracion',
  {
    id: smallint('id').primaryKey().default(1),
    // Descuento por transferencia o efectivo en el local (FR-023, clarify 2026-10-29).
    descuentoPct: numeric('descuento_pct', { precision: 5, scale: 2 }).notNull().default('10'),
    bancoTitular: text('banco_titular').notNull().default(''),
    bancoCbu: text('banco_cbu').notNull().default(''),
    bancoAlias: text('banco_alias').notNull().default(''),
    bancoCuit: text('banco_cuit').notNull().default(''),
    whatsapp: text('whatsapp').notNull().default(''),
    horarios: jsonb('horarios').$type<FranjaHoraria[]>().notNull().default([]),
    comercioRazonSocial: text('comercio_razon_social').notNull().default(''),
    comercioCuit: text('comercio_cuit').notNull().default(''),
    comercioDomicilio: text('comercio_domicilio').notNull().default(''),
    // FR-073: teléfono y coordenadas para los datos estructurados del comercio.
    comercioTelefono: text('comercio_telefono').notNull().default(''),
    comercioLat: numeric('comercio_lat', { precision: 9, scale: 6 }),
    comercioLng: numeric('comercio_lng', { precision: 9, scale: 6 }),
    googleResenasUrl: text('google_resenas_url').notNull().default(''),
    horasVencTransferencia: integer('horas_venc_transferencia').notNull().default(48),
    minutosVencMercadopago: integer('minutos_venc_mercadopago').notNull().default(30),
    actualizadoEn: actualizadoEn(),
  },
  (t) => [
    check('configuracion_fila_unica', sql`${t.id} = 1`),
    check('configuracion_descuento_rango', sql`${t.descuentoPct} between 0 and 50`),
  ],
);
