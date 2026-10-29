import type { Cotizacion, PedidoCreado, SolicitudCotizacion, SolicitudPedido } from '@casa/shared';
import type { Logger } from '../../../platform/logger.js';
import type { BaseDeDatos, Ejecutor } from '../../../platform/db.js';
import { Dinero } from '../../../shared-kernel/dinero.js';
import { ErrorDeDominio, validacion } from '../../../shared-kernel/errores.js';
import type { PasarelaPago } from '../../../shared-kernel/puertos.js';
import type { Reloj } from '../../../shared-kernel/reloj.js';
import type { ServicioStock } from '../../catalogo/application/stock.js';
import type { ServicioCompradores } from '../../clientes/application/compradores.js';
import type { ServicioConfiguracion } from '../../configuracion/application/configuracion.js';
import type { ServicioZonas } from '../../entregas/application/zonas.js';
import type { Outbox } from '../../notificaciones/application/outbox.js';
import { MEDIOS_PAGO, mediosDisponibles, type MedioPago } from '../../pagos/domain/medios-pago.js';
import { calcularImportes } from '../domain/importes.js';
import { pedidoEventos, pedidoItems, pedidos } from '../infrastructure/schema.js';
import type { DatosMailPedido } from './datos-mail.js';

export interface DependenciasPedidos {
  db: BaseDeDatos;
  stock: ServicioStock;
  compradores: ServicioCompradores;
  configuracion: ServicioConfiguracion;
  zonas: ServicioZonas;
  outbox: Outbox;
  pasarela: PasarelaPago;
  datosMail: DatosMailPedido;
  reloj: Reloj;
  logger: Logger;
  urlApi: string;
}

/** Compra como invitado (US2): cotizar y crear el pedido con reserva atómica de stock. */
export class ServicioPedidos {
  constructor(private readonly d: DependenciasPedidos) {}

  private medio(s: SolicitudCotizacion): MedioPago {
    const medio = MEDIOS_PAGO[s.medioPago];
    if (!medio.disponiblePara(s.entrega)) {
      throw new ErrorDeDominio(
        'regla_de_negocio',
        'MEDIO_NO_DISPONIBLE',
        'El pago en efectivo es solo para retirar en el local',
      );
    }
    return medio;
  }

  private async costoZona(ej: Ejecutor, s: SolicitudCotizacion): Promise<Dinero> {
    if (s.entrega !== 'colocacion') return Dinero.cero();
    const zona = s.zonaId ? await this.d.zonas.obtenerActiva(s.zonaId, ej) : null;
    if (!zona) throw validacion({ zonaId: 'Elegí la zona donde vamos a colocarla' });
    return zona.costoExtra;
  }

  /** Muestra importes antes de confirmar. No reserva stock. */
  async cotizar(s: SolicitudCotizacion): Promise<Cotizacion> {
    const medio = MEDIOS_PAGO[s.medioPago];
    const [vigentes, config, costoZona] = await Promise.all([
      this.d.stock.vigentes(s.items.map((i) => i.productoId)),
      this.d.configuracion.obtener(),
      this.costoZona(this.d.db, s),
    ]);
    const lineas = s.items.map((i) => {
      const p = vigentes.get(i.productoId);
      if (!p || p.stock < i.cantidad) {
        throw new ErrorDeDominio('conflicto', 'STOCK_INSUFICIENTE', p ? `No hay stock suficiente de ${p.nombre}` : 'Ese producto ya no está disponible', undefined, { productoId: i.productoId });
      }
      return { ...i, nombre: p.nombre, precioUnitario: p.precioLista };
    });
    const descuentoPct = Number(config.descuentoPct);
    const importes = calcularImportes({
      lineas,
      descuentoPct,
      aplicaDescuento: medio.disponiblePara(s.entrega) && medio.aplicaDescuento,
      costoZona,
    });
    return {
      items: lineas.map((l) => ({
        productoId: l.productoId,
        nombre: l.nombre,
        cantidad: l.cantidad,
        precioUnitario: l.precioUnitario.aNumero(),
        subtotal: l.precioUnitario.por(l.cantidad).aNumero(),
      })),
      subtotal: importes.subtotal.aNumero(),
      descuento: importes.descuento.aNumero(),
      costoZona: importes.costoZona.aNumero(),
      total: importes.total.aNumero(),
      descuentoPct,
      mediosDisponibles: mediosDisponibles(s.entrega),
    };
  }

  /**
   * Crea el pedido: importes en el servidor, stock descontado en la misma transacción
   * (constitución V), comprador con DNI cifrado, evento inicial y mails por outbox.
   */
  async crear(s: SolicitudPedido): Promise<PedidoCreado> {
    const medio = this.medio(s);
    const ahora = this.d.reloj.ahora();

    const creado = await this.d.db.transaction(async (tx) => {
      const config = await this.d.configuracion.obtener(tx);
      const costoZona = await this.costoZona(tx, s);
      const reservados = await this.d.stock.reservar(tx, s.items);
      const descuentoPct = Number(config.descuentoPct);
      const importes = calcularImportes({
        lineas: reservados.map((r) => ({ precioUnitario: r.precioLista, cantidad: r.cantidad })),
        descuentoPct,
        aplicaDescuento: medio.aplicaDescuento,
        costoZona,
      });
      const venceEn = medio.vencimiento(ahora, {
        minutosVencMercadopago: config.minutosVencMercadopago,
        horasVencTransferencia: config.horasVencTransferencia,
      });

      const [pedido] = await tx
        .insert(pedidos)
        .values({
          estado: medio.estadoInicial,
          entrega: s.entrega,
          zonaId: s.entrega === 'colocacion' ? (s.zonaId ?? null) : null,
          medioPago: medio.id,
          subtotal: importes.subtotal.centavos,
          descuento: importes.descuento.centavos,
          costoZona: importes.costoZona.centavos,
          total: importes.total.centavos,
          descuentoPctAplicado: medio.aplicaDescuento ? String(descuentoPct) : '0',
          venceEn,
          creadoEn: ahora,
        })
        .returning();
      if (!pedido) throw new Error('No se pudo crear el pedido');

      await tx.insert(pedidoItems).values(
        reservados.map((r) => ({
          pedidoId: pedido.id,
          productoId: r.productoId,
          nombreProducto: r.nombre,
          cantidad: r.cantidad,
          precioUnitario: r.precioLista.centavos,
        })),
      );
      await this.d.compradores.guardar(tx, pedido.id, s.comprador);
      await tx.insert(pedidoEventos).values({
        pedidoId: pedido.id,
        de: null,
        a: pedido.estado,
        actor: 'comprador',
        motivo: 'pedido creado',
      });

      const datos = await this.d.datosMail.para(tx, pedido.id);
      await this.d.outbox.encolar(tx, {
        clave: `pedido_recibido:${pedido.id}:comprador`,
        canal: 'mail',
        evento: 'pedido_recibido',
        destinatario: 'comprador',
        pedidoId: pedido.id,
        datos,
      });
      await this.d.outbox.encolar(tx, {
        clave: `aviso_admin_pedido_nuevo:${pedido.id}:admin`,
        canal: 'mail',
        evento: 'aviso_admin_pedido_nuevo',
        destinatario: 'admin',
        pedidoId: pedido.id,
        datos,
      });
      return { pedido, reservados, banco: datos.banco as Record<string, string> | null };
    });

    const { pedido } = creado;
    const base = {
      id: pedido.id,
      numero: pedido.numero,
      urlSeguimiento: this.d.datosMail.urlSeguimiento(pedido.id),
      total: Number(pedido.total),
    };

    if (medio.id === 'transferencia') {
      const b = creado.banco ?? {};
      return {
        ...base,
        pago: {
          tipo: 'transferencia',
          banco: {
            titular: b.titular ?? '',
            cbu: b.cbu ?? '',
            alias: b.alias ?? '',
            cuit: b.cuit ?? '',
            monto: Number(pedido.total),
            venceEn: pedido.venceEn?.toISOString() ?? '',
          },
        },
      };
    }
    if (medio.id === 'efectivo') return { ...base, pago: { tipo: 'efectivo' } };

    return { ...base, pago: { tipo: 'mercadopago', initPoint: await this.preferencia(pedido.id, s.comprador.email) } };
  }

  /**
   * Crea la preferencia de Mercado Pago fuera de la transacción. Si falla, el pedido queda
   * pendiente y el comprador puede reintentar desde el seguimiento (FR-026).
   */
  async preferencia(pedidoId: string, email: string): Promise<string | null> {
    try {
      const datos = await this.d.datosMail.para(this.d.db, pedidoId);
      const items = datos.items as { nombre: string; cantidad: number; precioUnitario: number }[];
      const venceEn = datos.venceEn ? new Date(String(datos.venceEn)) : new Date();
      const { initPoint } = await this.d.pasarela.crearPreferencia({
        pedidoId,
        items: items.map((i) => ({ titulo: i.nombre, cantidad: i.cantidad, precioUnitarioCentavos: BigInt(i.precioUnitario) })),
        emailComprador: email,
        urlRetorno: String(datos.urlSeguimiento),
        urlNotificacion: `${this.d.urlApi}/api/v1/webhooks/mercadopago`,
        venceEn,
      });
      return initPoint;
    } catch (error) {
      this.d.logger.error({ pedidoId, err: String(error) }, 'no se pudo crear la preferencia de Mercado Pago');
      return null;
    }
  }
}
