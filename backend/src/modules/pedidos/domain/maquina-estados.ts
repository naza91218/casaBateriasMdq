/**
 * Máquina de estados del pedido (FR-032, data-model.md). Pura: no conoce la base.
 * La única puerta para cambiar un estado es `cambiarEstado`, que usa esta tabla.
 */
export const ESTADOS = [
  'pendiente_pago',
  'a_pagar_en_local',
  'pagado',
  'en_camino',
  'listo_para_retirar',
  'entregado',
  'cancelado',
] as const;
export type EstadoPedido = (typeof ESTADOS)[number];

export type Entrega = 'colocacion' | 'retiro';

const TRANSICIONES: Record<EstadoPedido, EstadoPedido[]> = {
  pendiente_pago: ['pagado', 'cancelado'],
  a_pagar_en_local: ['entregado', 'cancelado'],
  pagado: ['en_camino', 'listo_para_retirar', 'cancelado'],
  en_camino: ['entregado'],
  listo_para_retirar: ['entregado'],
  entregado: [],
  cancelado: [],
};

/** Transiciones válidas para un pedido según su forma de entrega. */
export function transicionesPermitidas(estado: EstadoPedido, entrega: Entrega): EstadoPedido[] {
  return TRANSICIONES[estado].filter((a) => {
    if (a === 'en_camino') return entrega === 'colocacion';
    if (a === 'listo_para_retirar') return entrega === 'retiro';
    return true;
  });
}

export function puedeTransicionar(de: EstadoPedido, a: EstadoPedido, entrega: Entrega): boolean {
  return transicionesPermitidas(de, entrega).includes(a);
}

/** Un pedido terminado no admite cambios. */
export const esFinal = (estado: EstadoPedido) => TRANSICIONES[estado].length === 0;
