import { and, eq, lte } from 'drizzle-orm';
import type { BaseDeDatos } from '../../../platform/db.js';
import { ErrorDeDominio } from '../../../shared-kernel/errores.js';
import type { Reloj } from '../../../shared-kernel/reloj.js';
import { pedidos } from '../infrastructure/schema.js';
import type { ServicioEstados } from './cambiar-estado.js';

/**
 * Cancela los pedidos impagos vencidos y devuelve su stock (FR-034): 30 min con Mercado Pago,
 * 48 h con transferencia. Los de efectivo no tienen vencimiento (vence_en null).
 */
export class ServicioVencimientos {
  constructor(
    private readonly db: BaseDeDatos,
    private readonly estados: ServicioEstados,
    private readonly reloj: Reloj,
  ) {}

  async cancelarVencidos(limite = 100): Promise<number> {
    const vencidos = await this.db
      .select({ id: pedidos.id })
      .from(pedidos)
      .where(and(eq(pedidos.estado, 'pendiente_pago'), lte(pedidos.venceEn, this.reloj.ahora())))
      .limit(limite);

    let cancelados = 0;
    for (const { id } of vencidos) {
      try {
        await this.estados.cambiar({
          pedidoId: id,
          a: 'cancelado',
          actor: 'worker',
          motivo: 'vencido',
        });
        cancelados++;
      } catch (error) {
        // Si justo se pagó, la transición ya no es válida: se ignora.
        if (!(error instanceof ErrorDeDominio && error.codigo === 'TRANSICION_INVALIDA'))
          throw error;
      }
    }
    return cancelados;
  }
}
