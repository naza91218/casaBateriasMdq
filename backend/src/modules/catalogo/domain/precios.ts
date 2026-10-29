import { Dinero } from '../../../shared-kernel/dinero.js';

export type Gama = 'economica' | 'reforzada';

export interface PreciosProducto {
  lista: Dinero;
  /** Precio con el descuento por transferencia o efectivo en el local (FR-023). */
  transferenciaOEfectivo: Dinero;
  descuentoPct: number;
}

/** Calculadora pura: la usan la ficha, el checkout y el pedido, así nunca difieren. */
export function calcularPrecios(lista: Dinero, descuentoPct: number): PreciosProducto {
  return {
    lista,
    transferenciaOEfectivo: lista.restar(lista.porcentaje(descuentoPct)),
    descuentoPct,
  };
}

/** Explicación simple de cada gama, para quien no sabe de baterías (FR-007). */
export const EXPLICACION_GAMA: Record<Gama, string> = {
  economica:
    'Para el uso de todos los días en la ciudad. Arranca sin problemas y cuida tu bolsillo.',
  reforzada:
    'Para autos con más consumo eléctrico, mucho uso o arranques en frío. Dura más y aguanta más exigencia.',
};

/** El diferencial del negocio, visible en cada ficha (constitución II). */
export const SERVICIO_INCLUIDO = [
  'Colocación incluida',
  'Medición del alternador',
  '12 meses de garantía',
] as const;

/** Orden de las gamas en listados y resultados: económica primero (FR-011). */
export const ORDEN_GAMA: Gama[] = ['economica', 'reforzada'];
