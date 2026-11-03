import { DIA, HORA, MINUTO } from '../../../shared-kernel/reloj.js';
import type { Entrega, EstadoPedido } from '../../pedidos/domain/maquina-estados.js';

export type IdMedioPago = 'mercadopago' | 'transferencia' | 'efectivo';

export interface PlazosConfigurados {
  minutosVencMercadopago: number;
  horasVencTransferencia: number;
  diasVencEfectivo: number;
}

/**
 * Strategy por medio de pago (SOLID-O): sumar un medio nuevo es agregar una entrada,
 * sin tocar el checkout.
 */
export interface MedioPago {
  id: IdMedioPago;
  /** El efectivo es solo para retiro en el local (FR-022). */
  disponiblePara(entrega: Entrega): boolean;
  /** Transferencia y efectivo tienen el mismo descuento (FR-023, clarify). */
  aplicaDescuento: boolean;
  estadoInicial: EstadoPedido;
  /** Cuándo se cancela solo si no se paga (o no se retira, con efectivo). */
  vencimiento(creado: Date, plazos: PlazosConfigurados): Date;
}

export const MEDIOS_PAGO: Record<IdMedioPago, MedioPago> = {
  mercadopago: {
    id: 'mercadopago',
    disponiblePara: () => true,
    aplicaDescuento: false,
    estadoInicial: 'pendiente_pago',
    vencimiento: (creado, p) => new Date(creado.getTime() + p.minutosVencMercadopago * MINUTO),
  },
  transferencia: {
    id: 'transferencia',
    disponiblePara: () => true,
    aplicaDescuento: true,
    estadoInicial: 'pendiente_pago',
    vencimiento: (creado, p) => new Date(creado.getTime() + p.horasVencTransferencia * HORA),
  },
  efectivo: {
    id: 'efectivo',
    disponiblePara: (entrega) => entrega === 'retiro',
    aplicaDescuento: true,
    estadoInicial: 'a_pagar_en_local',
    // Si no pasa a retirarla en 7 días, el pedido se cancela y el stock vuelve (clarify 2026-11-02).
    vencimiento: (creado, p) => new Date(creado.getTime() + p.diasVencEfectivo * DIA),
  },
};

export function mediosDisponibles(entrega: Entrega): IdMedioPago[] {
  return Object.values(MEDIOS_PAGO)
    .filter((m) => m.disponiblePara(entrega))
    .map((m) => m.id);
}
