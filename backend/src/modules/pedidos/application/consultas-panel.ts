import type { CambioEstadoAdmin, FiltroPedidosAdmin, ListaPedidosAdmin, PedidoDetalleAdmin } from '@casa/shared';
import { and, asc, count, desc, eq, inArray, lt, or, sql } from 'drizzle-orm';
import type { BaseDeDatos } from '../../../platform/db.js';
import { ErrorDeDominio, noEncontrado } from '../../../shared-kernel/errores.js';
import { DIA, HORA, type Reloj } from '../../../shared-kernel/reloj.js';
import { enlaceWhatsapp, telefonoArgentino } from '../../../shared-kernel/whatsapp.js';
import { usuariosPanel } from '../../auth/infrastructure/schema.js';
import { puedeAnonimizar } from '../../clientes/application/anonimizar.js';
import type { ServicioCompradores } from '../../clientes/application/compradores.js';
import { pedidoCompradores } from '../../clientes/infrastructure/schema.js';
import type { ServicioZonas } from '../../entregas/application/zonas.js';
import type { ServicioArrepentimientos } from '../../legales/application/arrepentimientos.js';
import type { ServicioAlertas } from '../../pagos/application/alertas.js';
import { alertas, pagos } from '../../pagos/infrastructure/schema.js';
import { transicionesPermitidas, type EstadoPedido } from '../domain/maquina-estados.js';
import { pedidoEventos, pedidoItems, pedidos } from '../infrastructure/schema.js';
import type { ServicioEstados } from './cambiar-estado.js';

/** Los pedidos a pagar en el local no vencen solos; pasado este plazo se destacan (FR-034). */
const ESPERA_DESTACADA = 48 * HORA;

function espera(estado: EstadoPedido, creadoEn: Date, ahora: Date) {
  if (estado !== 'a_pagar_en_local') return { diasEsperando: null, destacado: false };
  const ms = ahora.getTime() - creadoEn.getTime();
  return { diasEsperando: Math.floor(ms / DIA), destacado: ms > ESPERA_DESTACADA };
}

/**
 * Pasar a pagado o cobrar el efectivo tienen su propio botón, que registra el pago manual
 * (FR-028, FR-029); los de Mercado Pago los confirma solo el webhook. Por eso no se ofrecen
 * como un cambio de estado común.
 */
function requiereAccionPropia(estado: EstadoPedido, a: EstadoPedido): boolean {
  return (estado === 'pendiente_pago' && a === 'pagado') || (estado === 'a_pagar_en_local' && a === 'entregado');
}

/** Lo que espera una acción del administrador: verificar una transferencia, preparar, cobrar. */
const porAtender = or(
  inArray(pedidos.estado, ['pagado', 'a_pagar_en_local']),
  and(eq(pedidos.estado, 'pendiente_pago'), eq(pedidos.medioPago, 'transferencia')),
);

/** Lectura y gestión de pedidos desde el panel (FR-043, FR-044). */
export class ServicioPanelPedidos {
  constructor(
    private readonly db: BaseDeDatos,
    private readonly estados: ServicioEstados,
    private readonly compradores: ServicioCompradores,
    private readonly zonas: ServicioZonas,
    private readonly alertas: ServicioAlertas,
    private readonly arrepentimientos: ServicioArrepentimientos,
    private readonly reloj: Reloj,
  ) {}

  /** Nuevos primero, con filtro por estado. */
  async listar(filtro: FiltroPedidosAdmin): Promise<ListaPedidosAdmin> {
    const donde = filtro.estado ? eq(pedidos.estado, filtro.estado) : undefined;
    const alertasAbiertas = sql<number>`(select count(*)::int from ${alertas} where ${alertas.pedidoId} = ${pedidos.id} and ${alertas.resueltaEn} is null)`;
    const [filas, [total]] = await Promise.all([
      this.db
        .select({
          id: pedidos.id,
          numero: pedidos.numero,
          estado: pedidos.estado,
          entrega: pedidos.entrega,
          medioPago: pedidos.medioPago,
          total: pedidos.total,
          comprador: pedidoCompradores.nombre,
          creadoEn: pedidos.creadoEn,
          alertasAbiertas,
        })
        .from(pedidos)
        .leftJoin(pedidoCompradores, eq(pedidoCompradores.pedidoId, pedidos.id))
        .where(donde)
        .orderBy(desc(pedidos.creadoEn), desc(pedidos.numero))
        .limit(filtro.porPagina)
        .offset((filtro.pagina - 1) * filtro.porPagina),
      this.db.select({ n: count() }).from(pedidos).where(donde),
    ]);
    const ahora = this.reloj.ahora();
    return {
      items: filas.map((f) => ({
        ...f,
        total: Number(f.total),
        comprador: f.comprador ?? '',
        creadoEn: f.creadoEn.toISOString(),
        ...espera(f.estado, f.creadoEn, ahora),
      })),
      total: total?.n ?? 0,
      pagina: filtro.pagina,
      porPagina: filtro.porPagina,
    };
  }

  /** Detalle completo. Es la única respuesta de la API que incluye el DNI (FR-059). */
  async detalle(id: string): Promise<PedidoDetalleAdmin> {
    const [pedido] = await this.db.select().from(pedidos).where(eq(pedidos.id, id));
    if (!pedido) throw noEncontrado('No encontramos ese pedido');

    const [items, comprador, zona, pagosDelPedido, eventos, alertasDelPedido, arrepentimientos] = await Promise.all([
      this.db
        .select({ nombre: pedidoItems.nombreProducto, cantidad: pedidoItems.cantidad, precioUnitario: pedidoItems.precioUnitario })
        .from(pedidoItems)
        .where(eq(pedidoItems.pedidoId, id))
        .orderBy(asc(pedidoItems.nombreProducto)),
      this.compradores.paraPanel(this.db, id),
      pedido.zonaId ? this.zonas.obtener(pedido.zonaId) : Promise.resolve(null),
      this.db
        .select({
          medio: pagos.medio,
          estado: pagos.estado,
          monto: pagos.monto,
          idExterno: pagos.idExterno,
          confirmadoPor: usuariosPanel.email,
          creadoEn: pagos.creadoEn,
        })
        .from(pagos)
        .leftJoin(usuariosPanel, eq(usuariosPanel.id, pagos.confirmadoPor))
        .where(eq(pagos.pedidoId, id))
        .orderBy(asc(pagos.creadoEn), asc(pagos.id)),
      this.db
        .select({
          de: pedidoEventos.de,
          a: pedidoEventos.a,
          actor: pedidoEventos.actor,
          email: usuariosPanel.email,
          motivo: pedidoEventos.motivo,
          rechazado: pedidoEventos.rechazado,
          creadoEn: pedidoEventos.creadoEn,
        })
        .from(pedidoEventos)
        // El actor es un id de usuario del panel o un nombre de sistema ('worker', 'mercadopago').
        .leftJoin(usuariosPanel, eq(sql`${usuariosPanel.id}::text`, pedidoEventos.actor))
        .where(eq(pedidoEventos.pedidoId, id))
        .orderBy(asc(pedidoEventos.creadoEn), asc(pedidoEventos.id)),
      this.alertas.listar({ soloAbiertas: false, pedidoIds: [id] }),
      this.arrepentimientos.delPedido(this.db, id),
    ]);
    if (!comprador) throw new Error(`El pedido ${id} no tiene comprador`);

    const visible = !comprador.anonimizado;
    const direccion = [comprador.calle, comprador.numero].filter(Boolean).join(' ');
    const mapaUrl =
      visible && pedido.entrega === 'colocacion' && direccion
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${direccion}, ${zona?.nombre ?? 'Mar del Plata'}`)}`
        : null;
    const primerNombre = comprador.nombre.split(' ')[0] ?? '';

    return {
      id: pedido.id,
      numero: pedido.numero,
      estado: pedido.estado,
      entrega: pedido.entrega,
      zona: zona?.nombre ?? null,
      medioPago: pedido.medioPago,
      items: items.map((i) => ({ ...i, precioUnitario: Number(i.precioUnitario) })),
      subtotal: Number(pedido.subtotal),
      descuento: Number(pedido.descuento),
      costoZona: Number(pedido.costoZona),
      total: Number(pedido.total),
      creadoEn: pedido.creadoEn.toISOString(),
      venceEn: pedido.venceEn?.toISOString() ?? null,
      ...espera(pedido.estado, pedido.creadoEn, this.reloj.ahora()),
      comprador: {
        nombre: comprador.nombre,
        dni: comprador.dni,
        telefono: comprador.telefono,
        email: comprador.email,
        calle: comprador.calle ?? null,
        numero: comprador.numero ?? null,
        referencias: comprador.referencias ?? null,
        anonimizado: comprador.anonimizado,
      },
      pagos: pagosDelPedido.map((p) => ({
        ...p,
        monto: Number(p.monto),
        confirmadoPor: p.confirmadoPor ?? null,
        creadoEn: p.creadoEn.toISOString(),
      })),
      eventos: eventos.map(({ email, ...e }) => ({ ...e, actor: email ?? e.actor, creadoEn: e.creadoEn.toISOString() })),
      alertas: alertasDelPedido,
      arrepentimientos,
      puedeAnonimizar: puedeAnonimizar(pedido.estado, comprador.anonimizado),
      transicionesPermitidas: transicionesPermitidas(pedido.estado, pedido.entrega).filter(
        (a) => !requiereAccionPropia(pedido.estado, a),
      ),
      acciones: {
        confirmarTransferencia: pedido.medioPago === 'transferencia' && pedido.estado === 'pendiente_pago',
        registrarEfectivo: pedido.estado === 'a_pagar_en_local',
      },
      mapaUrl,
      whatsapp:
        visible && comprador.telefono
          ? enlaceWhatsapp(
              telefonoArgentino(comprador.telefono),
              `Hola ${primerNombre}, te escribimos de La Casa de las Baterías por tu pedido #${pedido.numero}`,
            )
          : null,
    };
  }

  /** Cambio de estado manual. Las transiciones inválidas las rechaza y registra `cambiarEstado`. */
  async moverEstado(id: string, cambio: CambioEstadoAdmin, usuarioId: string): Promise<void> {
    // Leído fuera de la transacción: un pedido nunca vuelve a pendiente ni a pagar en el local,
    // así que en el peor caso se rechaza algo que igual era inválido.
    const [pedido] = await this.db
      .select({ estado: pedidos.estado, medioPago: pedidos.medioPago })
      .from(pedidos)
      .where(eq(pedidos.id, id));
    if (!pedido) throw noEncontrado('No encontramos ese pedido');
    if (requiereAccionPropia(pedido.estado, cambio.a)) {
      const mensaje =
        pedido.estado === 'a_pagar_en_local'
          ? 'Para entregarlo, usá "Registrar cobro en efectivo"'
          : pedido.medioPago === 'transferencia'
            ? 'Para marcarlo como pagado, usá "Confirmar transferencia" después de verla en el banco'
            : 'Los pagos con Mercado Pago se confirman solos cuando Mercado Pago avisa';
      throw new ErrorDeDominio('regla_de_negocio', 'USAR_ACCION_DE_PAGO', mensaje);
    }
    await this.estados.cambiar({ pedidoId: id, a: cambio.a, actor: usuarioId, ...(cambio.motivo ? { motivo: cambio.motivo } : {}) });
  }

  /** Contadores para el inicio del panel. */
  async contadores(): Promise<{ pedidosPorAtender: number; pedidosDestacados: number }> {
    const limite = new Date(this.reloj.ahora().getTime() - ESPERA_DESTACADA);
    const [[atender], [destacados]] = await Promise.all([
      this.db.select({ n: count() }).from(pedidos).where(porAtender),
      this.db
        .select({ n: count() })
        .from(pedidos)
        .where(and(eq(pedidos.estado, 'a_pagar_en_local'), lt(pedidos.creadoEn, limite))),
    ]);
    return { pedidosPorAtender: atender?.n ?? 0, pedidosDestacados: destacados?.n ?? 0 };
  }
}
