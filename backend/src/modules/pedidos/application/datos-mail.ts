import { asc, eq } from 'drizzle-orm';
import type { FirmadorSeguimiento } from '../../../platform/crypto.js';
import type { Ejecutor } from '../../../platform/db.js';
import { enlaceWhatsapp } from '../../../shared-kernel/whatsapp.js';
import { enlacesPanel } from '../../notificaciones/application/eventos.js';
import type { ServicioCompradores } from '../../clientes/application/compradores.js';
import type { ServicioConfiguracion } from '../../configuracion/application/configuracion.js';
import { pedidoItems, pedidos } from '../infrastructure/schema.js';

/**
 * Arma los datos que necesitan las plantillas de mail de un pedido. Nunca incluye el DNI,
 * la dirección ni el teléfono del comprador (FR-038); sí los datos del comercio para el pie.
 */
export class DatosMailPedido {
  constructor(
    private readonly compradores: ServicioCompradores,
    private readonly configuracion: ServicioConfiguracion,
    private readonly firmador: FirmadorSeguimiento,
    private readonly urlFrontend: string,
  ) {}

  urlSeguimiento(pedidoId: string): string {
    return `${this.urlFrontend}/pedido/${pedidoId}?t=${this.firmador.token(pedidoId)}`;
  }

  async para(ej: Ejecutor, pedidoId: string): Promise<Record<string, unknown>> {
    const [pedido] = await ej.select().from(pedidos).where(eq(pedidos.id, pedidoId));
    if (!pedido) throw new Error('Pedido inexistente');
    const [items, contacto, config] = await Promise.all([
      ej
        .select({
          nombre: pedidoItems.nombreProducto,
          cantidad: pedidoItems.cantidad,
          precioUnitario: pedidoItems.precioUnitario,
        })
        .from(pedidoItems)
        .where(eq(pedidoItems.pedidoId, pedidoId))
        .orderBy(asc(pedidoItems.nombreProducto)),
      this.compradores.contacto(ej, pedidoId),
      this.configuracion.obtener(ej),
    ]);
    const transferenciaPendiente =
      pedido.medioPago === 'transferencia' && pedido.estado === 'pendiente_pago';
    return {
      email: contacto?.email ?? '',
      nombre: contacto?.nombre.split(' ')[0] ?? '',
      numero: pedido.numero,
      estado: pedido.estado,
      entrega: pedido.entrega,
      medioPago: pedido.medioPago,
      items: items.map((i) => ({ ...i, precioUnitario: Number(i.precioUnitario) })),
      subtotal: Number(pedido.subtotal),
      descuento: Number(pedido.descuento),
      costoZona: Number(pedido.costoZona),
      total: Number(pedido.total),
      venceEn: pedido.venceEn?.toISOString() ?? null,
      urlSeguimiento: this.urlSeguimiento(pedidoId),
      urlPanel: enlacesPanel(this.urlFrontend).pedido(pedidoId),
      whatsappUrl: enlaceWhatsapp(
        config.whatsapp,
        `Hola, tengo una consulta por mi pedido #${pedido.numero}`,
      ).url,
      resenasUrl: config.googleResenasUrl,
      comercio: {
        razonSocial: config.comercioRazonSocial,
        cuit: config.comercioCuit,
        domicilio: config.comercioDomicilio,
        telefono: config.comercioTelefono,
      },
      banco: transferenciaPendiente
        ? {
            titular: config.bancoTitular,
            cbu: config.bancoCbu,
            alias: config.bancoAlias,
            cuit: config.bancoCuit,
          }
        : null,
    };
  }
}
