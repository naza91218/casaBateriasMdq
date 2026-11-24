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
    'Para el uso de todos los días en la ciudad. Lleva menos placas por vaso (11 en una 12x75) y es más liviana: arranca sin problemas y cuida tu bolsillo.',
  reforzada:
    'Para autos con más consumo eléctrico, mucho uso o arranques en frío. Lleva más placas por vaso (13 en una 12x75): da más corriente para arrancar y aguanta más exigencia.',
};

/**
 * Garantía con la que entra cada batería (reunión con Mateo, 2026-11-17): las Sermat de 12x45 a
 * 12x75 tienen 18 meses; todas las demás, 12. Después el admin la puede cambiar por producto.
 */
export function garantiaPorDefecto(marca: string, medida: string): number {
  const ah = Number(/^12x(\d+)/.exec(medida)?.[1]);
  return marca.trim().toLowerCase() === 'sermat' && ah >= 45 && ah <= 75 ? 18 : 12;
}

/** El diferencial del negocio, visible en cada ficha (constitución II). */
export function servicioIncluido(garantiaMeses: number): string[] {
  return ['Colocación incluida', 'Medición del alternador', `${garantiaMeses} meses de garantía`];
}

/** Orden de las gamas en listados y resultados: económica primero (FR-011). */
export const ORDEN_GAMA: Gama[] = ['economica', 'reforzada'];
