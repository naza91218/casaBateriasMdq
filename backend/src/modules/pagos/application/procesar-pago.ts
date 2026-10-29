import { eq, sql } from 'drizzle-orm';
import type { BaseDeDatos, Transaccion } from '../../../platform/db.js';
import { ErrorDeDominio } from '../../../shared-kernel/errores.js';
import type { PasarelaPago } from '../../../shared-kernel/puertos.js';
import type { Outbox } from '../../notificaciones/application/outbox.js';
import type { ServicioEstados } from '../../pedidos/application/cambiar-estado.js';
import { pedidos } from '../../pedidos/infrastructure/schema.js';
import { alertas, pagos } from '../infrastructure/schema.js';

export interface NotificacionMp {
  tipo: string;
  idPago: string;
  requestId: string;
  firma: string;
}

export type ResultadoNotificacion =
  | 'ignorada'
  | 'repetida'
  | 'pagado'
  | 'registrado'
  | 'alerta_monto_distinto'
  | 'alerta_pago_sobre_cancelado';

/**
 * Webhook de Mercado Pago (contracts/webhook-mercadopago.md). Un pedido pasa a pagado solo si
 * Mercado Pago confirma el pago consultado a su API y el monto coincide (FR-024, FR-031).
 */
export class ServicioPagosMercadoPago {
  constructor(
    private readonly db: BaseDeDatos,
    private readonly pasarela: PasarelaPago,
    private readonly estados: ServicioEstados,
    private readonly outbox: Outbox,
  ) {}

  async procesar(n: NotificacionMp): Promise<ResultadoNotificacion> {
    if (!this.pasarela.verificarFirma({ idRecurso: n.idPago, requestId: n.requestId, cabeceraFirma: n.firma })) {
      throw new ErrorDeDominio('no_autorizado', 'FIRMA_INVALIDA', 'Firma inválida');
    }
    if (n.tipo !== 'payment') return 'ignorada';

    // Nunca se confía en lo que trae la notificación: se consulta el pago (US2-08).
    const pago = await this.pasarela.consultarPago(n.idPago);
    if (!pago.referenciaExterna) return 'ignorada';

    return this.db.transaction(async (tx) => {
      const [pedido] = await tx.select().from(pedidos).where(eq(pedidos.id, pago.referenciaExterna ?? '')).for('update');
      if (!pedido) return 'ignorada';

      // Idempotencia (FR-025): si ya teníamos este pago con el mismo estado, no se hace nada.
      const [registrado] = await tx
        .insert(pagos)
        .values({
          pedidoId: pedido.id,
          medio: 'mercadopago',
          idExterno: pago.id,
          estado: pago.estado,
          monto: pago.montoCentavos,
          payload: pago.resumen,
        })
        .onConflictDoUpdate({
          target: [pagos.medio, pagos.idExterno],
          targetWhere: sql`${pagos.idExterno} is not null`,
          set: { estado: pago.estado, payload: pago.resumen },
          setWhere: sql`${pagos.estado} <> excluded.estado`,
        })
        .returning({ id: pagos.id });
      if (!registrado) return 'repetida';

      if (pago.estado !== 'approved') return 'registrado';
      if (pedido.estado === 'cancelado') {
        await this.alertar(tx, pedido.id, 'pago_sobre_cancelado', { pagoId: pago.id, monto: Number(pago.montoCentavos) });
        return 'alerta_pago_sobre_cancelado';
      }
      if (pedido.estado !== 'pendiente_pago') return 'registrado';
      if (pago.montoCentavos !== pedido.total) {
        await this.alertar(tx, pedido.id, 'monto_distinto', {
          pagoId: pago.id,
          montoPagado: Number(pago.montoCentavos),
          totalPedido: Number(pedido.total),
        });
        return 'alerta_monto_distinto';
      }
      await this.estados.cambiarEnTx(tx, {
        pedidoId: pedido.id,
        a: 'pagado',
        actor: 'mercadopago',
        motivo: `pago ${pago.id} aprobado`,
      });
      return 'pagado';
    });
  }

  private async alertar(
    tx: Transaccion,
    pedidoId: string,
    tipo: 'monto_distinto' | 'pago_sobre_cancelado',
    detalle: Record<string, unknown>,
  ): Promise<void> {
    const [alerta] = await tx.insert(alertas).values({ pedidoId, tipo, detalle }).returning({ id: alertas.id });
    const [pedido] = await tx.select({ numero: pedidos.numero }).from(pedidos).where(eq(pedidos.id, pedidoId));
    await this.outbox.encolar(tx, {
      clave: `aviso_admin_alerta:${alerta?.id}:admin`,
      canal: 'mail',
      evento: 'aviso_admin_alerta',
      destinatario: 'admin',
      pedidoId,
      datos: { tipo, numero: pedido?.numero, ...detalle },
    });
  }
}
