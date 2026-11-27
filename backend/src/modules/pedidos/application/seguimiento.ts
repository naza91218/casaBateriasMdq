import type { Seguimiento } from '@casa/shared';
import { asc, eq } from 'drizzle-orm';
import type { FirmadorSeguimiento } from '../../../platform/crypto.js';
import type { BaseDeDatos } from '../../../platform/db.js';
import { ErrorDeDominio, noEncontrado } from '../../../shared-kernel/errores.js';
import type { Reloj } from '../../../shared-kernel/reloj.js';
import { enlaceWhatsapp } from '../../../shared-kernel/whatsapp.js';
import type { ServicioCompradores } from '../../clientes/application/compradores.js';
import type { ServicioConfiguracion } from '../../configuracion/application/configuracion.js';
import type { ServicioZonas } from '../../entregas/application/zonas.js';
import { pedidoItems, pedidos } from '../infrastructure/schema.js';
import type { ServicioPedidos } from './crear-pedido.js';

type Retorno = 'approved' | 'rejected' | 'pending' | 'failure' | undefined;

/**
 * Seguimiento con el enlace privado (FR-021). Sin DNI, dirección ni teléfono (FR-059).
 * El retorno desde Mercado Pago solo cambia lo que se muestra, nunca el estado (FR-024).
 */
export class ServicioSeguimiento {
  constructor(
    private readonly db: BaseDeDatos,
    private readonly firmador: FirmadorSeguimiento,
    private readonly configuracion: ServicioConfiguracion,
    private readonly zonas: ServicioZonas,
    private readonly compradores: ServicioCompradores,
    private readonly pedidosSrv: ServicioPedidos,
    private readonly reloj: Reloj,
  ) {}

  private async pedidoConToken(id: string, token: string) {
    if (!this.firmador.verificar(id, token)) throw noEncontrado('No encontramos ese pedido');
    const [pedido] = await this.db.select().from(pedidos).where(eq(pedidos.id, id));
    if (!pedido) throw noEncontrado('No encontramos ese pedido');
    return pedido;
  }

  async obtener(id: string, token: string, retorno?: Retorno): Promise<Seguimiento> {
    const pedido = await this.pedidoConToken(id, token);
    const [items, config, zona] = await Promise.all([
      this.db
        .select({
          nombre: pedidoItems.nombreProducto,
          cantidad: pedidoItems.cantidad,
          precioUnitario: pedidoItems.precioUnitario,
        })
        .from(pedidoItems)
        .where(eq(pedidoItems.pedidoId, id))
        .orderBy(asc(pedidoItems.nombreProducto)),
      this.configuracion.obtener(),
      pedido.zonaId ? this.zonas.obtener(pedido.zonaId) : Promise.resolve(null),
    ]);
    const esMp = pedido.medioPago === 'mercadopago';
    const pendiente = pedido.estado === 'pendiente_pago';
    const vigente = !pedido.venceEn || pedido.venceEn > this.reloj.ahora();

    return {
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
      venceEn: pedido.venceEn?.toISOString() ?? null,
      banco:
        pedido.medioPago === 'transferencia' && pendiente
          ? {
              titular: config.bancoTitular,
              cbu: config.bancoCbu,
              alias: config.bancoAlias,
              cuit: config.bancoCuit,
              monto: Number(pedido.total),
              venceEn: pedido.venceEn?.toISOString() ?? '',
            }
          : null,
      pagoEnVerificacion: esMp && pendiente && retorno === 'approved',
      pagoRechazado: esMp && pendiente && (retorno === 'rejected' || retorno === 'failure'),
      puedeReintentarPago: esMp && pendiente && vigente,
      whatsapp: enlaceWhatsapp(
        config.whatsapp,
        `Hola, tengo una consulta por mi pedido #${pedido.numero}`,
      ),
    };
  }

  /** Nueva preferencia de Mercado Pago si el pedido sigue pendiente y no venció (FR-026). */
  async reintentarPago(id: string, token: string): Promise<{ initPoint: string | null }> {
    const pedido = await this.pedidoConToken(id, token);
    const vigente = !pedido.venceEn || pedido.venceEn > this.reloj.ahora();
    if (pedido.medioPago !== 'mercadopago' || pedido.estado !== 'pendiente_pago' || !vigente) {
      throw new ErrorDeDominio(
        'regla_de_negocio',
        'NO_SE_PUEDE_REINTENTAR',
        'Este pedido ya no se puede pagar. Escribinos por WhatsApp.',
      );
    }
    const contacto = await this.compradores.contacto(this.db, id);
    return { initPoint: await this.pedidosSrv.preferencia(id, contacto?.email ?? '') };
  }
}
