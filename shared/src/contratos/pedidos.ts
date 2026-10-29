import { z } from 'zod';
import { Importe, Whatsapp } from './comunes.js';

export const Entrega = z.enum(['colocacion', 'retiro']);
export type Entrega = z.infer<typeof Entrega>;

export const MedioPago = z.enum(['mercadopago', 'transferencia', 'efectivo']);
export type MedioPago = z.infer<typeof MedioPago>;

export const EstadoPedido = z.enum([
  'pendiente_pago',
  'a_pagar_en_local',
  'pagado',
  'en_camino',
  'listo_para_retirar',
  'entregado',
  'cancelado',
]);
export type EstadoPedido = z.infer<typeof EstadoPedido>;

export const ItemCarrito = z.object({
  productoId: z.string().uuid('Producto inválido'),
  cantidad: z.number().int().min(1, 'La cantidad mínima es 1').max(10, 'Para más de 10, escribinos'),
});

/** El navegador solo manda productos, cantidades y opciones: nunca precios (FR-019). */
export const SolicitudCotizacion = z.object({
  items: z.array(ItemCarrito).min(1, 'El carrito está vacío').max(10),
  entrega: Entrega,
  zonaId: z.string().uuid().optional(),
  medioPago: MedioPago,
});
export type SolicitudCotizacion = z.infer<typeof SolicitudCotizacion>;

/** Cada dato con su regla y un mensaje que dice cómo corregirlo (FR-015, FR-016). */
export const DatosComprador = z.object({
  nombre: z.string().trim().min(3, 'Escribí tu nombre y apellido').max(120),
  dni: z.string().trim().regex(/^\d{7,8}$/, 'El DNI tiene solo números, sin puntos'),
  telefono: z
    .string()
    .trim()
    .regex(/^[\d\s+()-]{8,20}$/, 'Escribí el teléfono con código de área, por ejemplo 223 512 3456'),
  email: z.string().trim().email('Escribí un mail válido, por ejemplo nombre@gmail.com'),
  calle: z.string().trim().max(120).optional(),
  numero: z.string().trim().max(20).optional(),
  referencias: z.string().trim().max(200).optional(),
});

export const SolicitudPedido = SolicitudCotizacion.extend({ comprador: DatosComprador }).superRefine(
  (s, ctx) => {
    if (s.entrega !== 'colocacion') return;
    if (!s.zonaId) {
      ctx.addIssue({ code: 'custom', path: ['zonaId'], message: 'Elegí la zona donde vamos a colocarla' });
    }
    if (!s.comprador.calle || !s.comprador.numero) {
      ctx.addIssue({ code: 'custom', path: ['comprador', 'calle'], message: 'Falta la dirección para ir a colocarla' });
    }
  },
);
export type SolicitudPedido = z.infer<typeof SolicitudPedido>;

export const Cotizacion = z.object({
  items: z.array(
    z.object({
      productoId: z.string(),
      nombre: z.string(),
      cantidad: z.number().int(),
      precioUnitario: Importe,
      subtotal: Importe,
    }),
  ),
  subtotal: Importe,
  descuento: Importe,
  costoZona: Importe,
  total: Importe,
  descuentoPct: z.number(),
  mediosDisponibles: z.array(MedioPago),
});
export type Cotizacion = z.infer<typeof Cotizacion>;

export const DatosBancarios = z.object({
  titular: z.string(),
  cbu: z.string(),
  alias: z.string(),
  cuit: z.string(),
  monto: Importe,
  venceEn: z.string(),
});

export const PagoDelPedido = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('mercadopago'), initPoint: z.string().nullable() }),
  z.object({ tipo: z.literal('transferencia'), banco: DatosBancarios }),
  z.object({ tipo: z.literal('efectivo') }),
]);

export const PedidoCreado = z.object({
  id: z.string(),
  numero: z.number().int(),
  urlSeguimiento: z.string(),
  total: Importe,
  pago: PagoDelPedido,
});
export type PedidoCreado = z.infer<typeof PedidoCreado>;

export const ConsultaSeguimiento = z.object({
  t: z.string().min(1),
  /** Lo agrega la página de retorno de Mercado Pago; nunca cambia el estado (FR-024). */
  retorno: z.enum(['approved', 'rejected', 'pending', 'failure']).optional(),
});

/** Seguimiento público del pedido: sin DNI, sin dirección, sin teléfono (FR-021, FR-059). */
export const Seguimiento = z.object({
  numero: z.number().int(),
  estado: EstadoPedido,
  entrega: Entrega,
  zona: z.string().nullable(),
  medioPago: MedioPago,
  items: z.array(z.object({ nombre: z.string(), cantidad: z.number().int(), precioUnitario: Importe })),
  subtotal: Importe,
  descuento: Importe,
  costoZona: Importe,
  total: Importe,
  venceEn: z.string().nullable(),
  banco: DatosBancarios.nullable(),
  pagoEnVerificacion: z.boolean(),
  pagoRechazado: z.boolean(),
  puedeReintentarPago: z.boolean(),
  whatsapp: Whatsapp,
});
export type Seguimiento = z.infer<typeof Seguimiento>;

export const SolicitudConsultaCanje = z.object({
  nombre: z.string().trim().min(3, 'Escribí tu nombre'),
  telefono: z.string().trim().regex(/^[\d\s+()-]{8,20}$/, 'Escribí el teléfono con código de área'),
  bateriaUsada: z.string().trim().max(120).optional(),
  auto: z.string().trim().max(120).optional(),
  localidad: z.string().trim().min(2, 'Escribí tu localidad'),
  productoId: z.string().uuid().optional(),
});
export type SolicitudConsultaCanje = z.infer<typeof SolicitudConsultaCanje>;
