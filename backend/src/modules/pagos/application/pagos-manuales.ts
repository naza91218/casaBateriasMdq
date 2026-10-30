import { eq } from 'drizzle-orm';
import type { BaseDeDatos } from '../../../platform/db.js';
import { ErrorDeDominio, noEncontrado } from '../../../shared-kernel/errores.js';
import type { ServicioEstados } from '../../pedidos/application/cambiar-estado.js';
import { pedidos } from '../../pedidos/infrastructure/schema.js';

/**
 * Pagos que solo el administrador puede dar por hechos (constitución V): la transferencia que
 * verificó en el banco (FR-028) y el efectivo que cobró en el local (FR-029). Los dos pasan por
 * `cambiarEstado`, que registra el pago manual con quién lo confirmó y encola los mails.
 */
export class ServicioPagosManuales {
  constructor(
    private readonly db: BaseDeDatos,
    private readonly estados: ServicioEstados,
  ) {}

  async confirmarTransferencia(pedidoId: string, usuarioId: string): Promise<void> {
    await this.exigirMedio(pedidoId, 'transferencia', 'Este pedido no se paga por transferencia');
    await this.estados.cambiar({
      pedidoId,
      a: 'pagado',
      actor: usuarioId,
      motivo: 'Transferencia verificada en el banco',
      pagoManual: { medio: 'transferencia', usuarioId },
    });
  }

  async registrarEfectivo(pedidoId: string, usuarioId: string): Promise<void> {
    await this.exigirMedio(pedidoId, 'efectivo', 'Este pedido no se paga en efectivo');
    await this.estados.cambiar({
      pedidoId,
      a: 'entregado',
      actor: usuarioId,
      motivo: 'Cobrado en efectivo en el local',
      pagoManual: { medio: 'efectivo', usuarioId },
    });
  }

  // El medio de pago no cambia nunca, así que se puede leer fuera de la transacción;
  // el estado lo valida `cambiarEstado` con el pedido bloqueado.
  private async exigirMedio(pedidoId: string, medio: 'transferencia' | 'efectivo', mensaje: string): Promise<void> {
    const [pedido] = await this.db
      .select({ medioPago: pedidos.medioPago })
      .from(pedidos)
      .where(eq(pedidos.id, pedidoId));
    if (!pedido) throw noEncontrado('No encontramos ese pedido');
    if (pedido.medioPago !== medio) throw new ErrorDeDominio('regla_de_negocio', 'MEDIO_DISTINTO', mensaje);
  }
}
