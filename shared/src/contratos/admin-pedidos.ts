import { z } from 'zod';
import { Importe, paginado, Whatsapp } from './comunes.ts';
import { Entrega, EstadoPedido, MedioPago } from './pedidos.ts';

/** Contratos del panel de pedidos (US3). Solo el detalle lleva el DNI (FR-043, FR-059). */

export const FiltroPedidosAdmin = z.object({
  estado: EstadoPedido.optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce.number().int().min(1).max(100).default(30),
});
export type FiltroPedidosAdmin = z.infer<typeof FiltroPedidosAdmin>;

export const PedidoEnLista = z.object({
  id: z.string(),
  numero: z.number().int(),
  estado: EstadoPedido,
  entrega: Entrega,
  medioPago: MedioPago,
  total: Importe,
  comprador: z.string(),
  creadoEn: z.string(),
  /** Solo en `a_pagar_en_local`: hace cuántos días espera (FR-034). */
  diasEsperando: z.number().int().nullable(),
  /** `a_pagar_en_local` con más de 48 h. */
  destacado: z.boolean(),
  alertasAbiertas: z.number().int(),
});
export type PedidoEnLista = z.infer<typeof PedidoEnLista>;

export const ListaPedidosAdmin = paginado(PedidoEnLista);
export type ListaPedidosAdmin = z.infer<typeof ListaPedidosAdmin>;

export const TipoAlerta = z.enum(['monto_distinto', 'pago_sobre_cancelado']);

export const Alerta = z.object({
  id: z.string(),
  pedidoId: z.string(),
  numeroPedido: z.number().int(),
  tipo: TipoAlerta,
  detalle: z.record(z.string(), z.unknown()),
  creadoEn: z.string(),
  resueltaEn: z.string().nullable(),
  resueltaPor: z.string().nullable(),
});
export type Alerta = z.infer<typeof Alerta>;

export const FiltroAlertas = z.object({
  estado: z.enum(['abiertas', 'todas']).default('abiertas'),
});

export const PedidoDetalleAdmin = z.object({
  id: z.string(),
  numero: z.number().int(),
  estado: EstadoPedido,
  entrega: Entrega,
  zona: z.string().nullable(),
  medioPago: MedioPago,
  items: z.array(
    z.object({ nombre: z.string(), cantidad: z.number().int(), precioUnitario: Importe }),
  ),
  subtotal: Importe,
  descuento: Importe,
  costoZona: Importe,
  total: Importe,
  creadoEn: z.string(),
  venceEn: z.string().nullable(),
  diasEsperando: z.number().int().nullable(),
  destacado: z.boolean(),
  comprador: z.object({
    nombre: z.string(),
    dni: z.string(),
    telefono: z.string(),
    email: z.string(),
    calle: z.string().nullable(),
    numero: z.string().nullable(),
    referencias: z.string().nullable(),
    anonimizado: z.boolean(),
  }),
  pagos: z.array(
    z.object({
      medio: MedioPago,
      estado: z.string(),
      monto: Importe,
      idExterno: z.string().nullable(),
      /** Mail de quien confirmó un pago manual (FR-030). */
      confirmadoPor: z.string().nullable(),
      creadoEn: z.string(),
    }),
  ),
  eventos: z.array(
    z.object({
      de: EstadoPedido.nullable(),
      a: EstadoPedido,
      /** Mail del usuario del panel, o 'sistema', 'mercadopago', 'worker'. */
      actor: z.string(),
      motivo: z.string(),
      rechazado: z.boolean(),
      creadoEn: z.string(),
    }),
  ),
  alertas: z.array(Alerta),
  /** Solicitudes de arrepentimiento vinculadas al pedido (FR-058). */
  arrepentimientos: z.array(z.object({ codigo: z.string(), creadoEn: z.string() })),
  /** Solo entregados o cancelados, y una sola vez (FR-061). */
  puedeAnonimizar: z.boolean(),
  /** Estados a los que se puede mover con `POST .../estado` (FR-044). */
  transicionesPermitidas: z.array(EstadoPedido),
  /** Botones de un toque: los pagos manuales tienen su propia acción (FR-028, FR-029). */
  acciones: z.object({ confirmarTransferencia: z.boolean(), registrarEfectivo: z.boolean() }),
  mapaUrl: z.string().nullable(),
  whatsapp: Whatsapp.nullable(),
});
export type PedidoDetalleAdmin = z.infer<typeof PedidoDetalleAdmin>;

export const CambioEstadoAdmin = z.object({
  a: EstadoPedido,
  motivo: z.string().trim().max(300).optional(),
});
export type CambioEstadoAdmin = z.infer<typeof CambioEstadoAdmin>;

/** Contadores del inicio del panel (FR-043, FR-070). */
export const ResumenAdmin = z.object({
  pedidosPorAtender: z.number().int(),
  pedidosDestacados: z.number().int(),
  alertasAbiertas: z.number().int(),
  productosARevisar: z.number().int(),
  consultasCanjePendientes: z.number().int(),
});
export type ResumenAdmin = z.infer<typeof ResumenAdmin>;

/** Solicitudes del botón de arrepentimiento en el panel (FR-058). */
export const ArrepentimientoAdmin = z.object({
  id: z.string(),
  codigo: z.string(),
  numeroPedido: z.number().int(),
  /** null si el número que escribió no corresponde a ningún pedido. */
  pedidoId: z.string().nullable(),
  nombre: z.string(),
  email: z.string(),
  creadoEn: z.string(),
});
export type ArrepentimientoAdmin = z.infer<typeof ArrepentimientoAdmin>;
