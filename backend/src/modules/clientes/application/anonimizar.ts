import { eq } from 'drizzle-orm';
import type { Cifrador } from '../../../platform/crypto.js';
import type { BaseDeDatos } from '../../../platform/db.js';
import { ErrorDeDominio, noEncontrado } from '../../../shared-kernel/errores.js';
import type { Reloj } from '../../../shared-kernel/reloj.js';
import type { ServicioArrepentimientos } from '../../legales/application/arrepentimientos.js';
import type { Outbox } from '../../notificaciones/application/outbox.js';
import { pedidos } from '../../pedidos/infrastructure/schema.js';
import { pedidoCompradores } from '../infrastructure/schema.js';

/** Con un pedido en curso todavía hacen falta los datos para entregarlo o cobrarlo. */
const ESTADOS_FINALES = new Set(['entregado', 'cancelado']);

export const puedeAnonimizar = (estado: string, anonimizado: boolean) =>
  ESTADOS_FINALES.has(estado) && !anonimizado;

/**
 * Derecho de supresión (Ley 25.326, FR-061): borra nombre, DNI, teléfono, mail y dirección del
 * comprador y conserva el pedido para la contabilidad (productos, totales, fecha y estados).
 * También limpia las solicitudes de arrepentimiento y los mails guardados de ese pedido.
 */
export class ServicioAnonimizacion {
  constructor(
    private readonly db: BaseDeDatos,
    private readonly cifrador: Cifrador,
    private readonly arrepentimientos: ServicioArrepentimientos,
    private readonly outbox: Outbox,
    private readonly reloj: Reloj,
  ) {}

  async anonimizar(pedidoId: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      const [pedido] = await tx
        .select({ estado: pedidos.estado })
        .from(pedidos)
        .where(eq(pedidos.id, pedidoId))
        .for('update');
      if (!pedido) throw noEncontrado('No encontramos ese pedido');
      const [comprador] = await tx
        .select({ anonimizadoEn: pedidoCompradores.anonimizadoEn })
        .from(pedidoCompradores)
        .where(eq(pedidoCompradores.pedidoId, pedidoId));
      if (comprador?.anonimizadoEn) {
        throw new ErrorDeDominio('conflicto', 'YA_ANONIMIZADO', 'Este pedido ya está anonimizado');
      }
      if (!ESTADOS_FINALES.has(pedido.estado)) {
        throw new ErrorDeDominio(
          'conflicto',
          'PEDIDO_EN_CURSO',
          'Solo se pueden anonimizar pedidos entregados o cancelados',
        );
      }

      // El DNI se reemplaza por un valor vacío cifrado: la columna no admite nulos.
      const vacio = this.cifrador.cifrar('');
      await tx
        .update(pedidoCompradores)
        .set({
          nombre: 'Anónimo',
          dniCifrado: vacio.datos,
          dniClaveVersion: vacio.version,
          telefono: '',
          email: '',
          calle: null,
          numero: null,
          referencias: null,
          anonimizadoEn: this.reloj.ahora(),
        })
        .where(eq(pedidoCompradores.pedidoId, pedidoId));
      await this.arrepentimientos.anonimizarDelPedido(tx, pedidoId);
      await this.outbox.olvidarMailsDelPedido(tx, pedidoId);
    });
  }
}
