import { eq } from 'drizzle-orm';
import type { BaseDeDatos, Transaccion } from '../../../platform/db.js';
import { Dinero } from '../../../shared-kernel/dinero.js';
import { ErrorDeDominio, noEncontrado } from '../../../shared-kernel/errores.js';
import type { ServicioStock } from '../../catalogo/application/stock.js';
import type { Outbox } from '../../notificaciones/application/outbox.js';
import { pagos } from '../../pagos/infrastructure/schema.js';
import { puedeTransicionar, type EstadoPedido } from '../domain/maquina-estados.js';
import { pedidoEventos, pedidoItems, pedidos } from '../infrastructure/schema.js';
import type { DatosMailPedido } from './datos-mail.js';

export interface SolicitudCambio {
  pedidoId: string;
  a: EstadoPedido;
  /** 'sistema', 'mercadopago', 'worker', 'comprador' o el id del usuario del panel. */
  actor: string;
  motivo?: string;
  /** Transferencia o efectivo confirmados por el administrador (FR-028, FR-029). */
  pagoManual?: { medio: 'transferencia' | 'efectivo'; usuarioId: string };
}

/** Mail al comprador según el estado al que llega (FR-036). */
const MAIL_COMPRADOR: Partial<Record<EstadoPedido, string>> = {
  pagado: 'pago_confirmado',
  en_camino: 'en_camino',
  listo_para_retirar: 'listo_para_retirar',
  entregado: 'entregado',
  cancelado: 'cancelado',
};

/** Avisos al administrador (FR-037). */
const MAIL_ADMIN: Partial<Record<EstadoPedido, string>> = {
  pagado: 'aviso_admin_pago',
};

/**
 * La única puerta para cambiar el estado de un pedido (constitución VII, FR-033): valida la
 * transición, aplica efectos (devolver stock una sola vez, registrar pago manual), registra el
 * evento y encola los mails, todo en la misma transacción.
 */
export class ServicioEstados {
  constructor(
    private readonly db: BaseDeDatos,
    private readonly stock: ServicioStock,
    private readonly outbox: Outbox,
    private readonly datosMail: DatosMailPedido,
  ) {}

  /** Abre su propia transacción. Una transición inválida queda registrada y responde 409. */
  async cambiar(s: SolicitudCambio): Promise<void> {
    const r = await this.db.transaction((tx) => this.cambiarEnTx(tx, s));
    if (!r.ok) {
      const de = r.de.replaceAll('_', ' ');
      throw new ErrorDeDominio(
        'conflicto',
        'TRANSICION_INVALIDA',
        // Mismo estado: casi siempre es un doble toque o dos pestañas abiertas.
        r.de === s.a ? `Este pedido ya está ${de}` : `El pedido está ${de} y no puede pasar a ${s.a.replaceAll('_', ' ')}`,
      );
    }
  }

  /** Para usar dentro de otra transacción (webhook de pagos, vencimientos). */
  async cambiarEnTx(tx: Transaccion, s: SolicitudCambio): Promise<{ ok: boolean; de: EstadoPedido }> {
    const [pedido] = await tx.select().from(pedidos).where(eq(pedidos.id, s.pedidoId)).for('update');
    if (!pedido) throw noEncontrado('No encontramos ese pedido');

    const evento = { pedidoId: pedido.id, de: pedido.estado, a: s.a, actor: s.actor, motivo: s.motivo ?? '' };
    if (!puedeTransicionar(pedido.estado, s.a, pedido.entrega)) {
      await tx.insert(pedidoEventos).values({ ...evento, rechazado: true });
      return { ok: false, de: pedido.estado };
    }

    if (s.a === 'cancelado') {
      const items = await tx
        .select({ productoId: pedidoItems.productoId, cantidad: pedidoItems.cantidad })
        .from(pedidoItems)
        .where(eq(pedidoItems.pedidoId, pedido.id));
      // Cancelado es final: este bloque corre una sola vez por pedido (FR-035).
      await this.stock.devolver(tx, items);
    }

    if (s.pagoManual) {
      await tx.insert(pagos).values({
        pedidoId: pedido.id,
        medio: s.pagoManual.medio,
        estado: 'confirmado_manual',
        monto: Dinero.deCentavos(pedido.total).centavos,
        confirmadoPor: s.pagoManual.usuarioId,
      });
    }

    await tx.update(pedidos).set({ estado: s.a }).where(eq(pedidos.id, pedido.id));
    await tx.insert(pedidoEventos).values(evento);

    const datos = await this.datosMail.para(tx, pedido.id);
    const mailComprador = MAIL_COMPRADOR[s.a];
    if (mailComprador) {
      await this.outbox.encolar(tx, {
        clave: `${mailComprador}:${pedido.id}:comprador`,
        canal: 'mail',
        evento: mailComprador,
        destinatario: 'comprador',
        pedidoId: pedido.id,
        datos,
      });
    }
    const mailAdmin = MAIL_ADMIN[s.a];
    if (mailAdmin) {
      await this.outbox.encolar(tx, {
        clave: `${mailAdmin}:${pedido.id}:admin`,
        canal: 'mail',
        evento: mailAdmin,
        destinatario: 'admin',
        pedidoId: pedido.id,
        datos,
      });
    }
    return { ok: true, de: pedido.estado };
  }
}
