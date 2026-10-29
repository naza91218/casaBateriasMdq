import { Dinero } from '../../../shared-kernel/dinero.js';

export interface LineaPedido {
  precioUnitario: Dinero;
  cantidad: number;
}

export interface Importes {
  subtotal: Dinero;
  descuento: Dinero;
  costoZona: Dinero;
  total: Dinero;
}

/**
 * Importes del pedido, siempre calculados en el servidor (FR-019, constitución V).
 * El descuento se calcula por unidad, igual que el "precio por transferencia" de la ficha,
 * para que lo que el comprador vio sea exactamente lo que paga.
 */
export function calcularImportes(entrada: {
  lineas: LineaPedido[];
  descuentoPct: number;
  aplicaDescuento: boolean;
  costoZona: Dinero;
}): Importes {
  let subtotal = Dinero.cero();
  let descuento = Dinero.cero();
  for (const l of entrada.lineas) {
    subtotal = subtotal.sumar(l.precioUnitario.por(l.cantidad));
    if (entrada.aplicaDescuento) {
      descuento = descuento.sumar(l.precioUnitario.porcentaje(entrada.descuentoPct).por(l.cantidad));
    }
  }
  return {
    subtotal,
    descuento,
    costoZona: entrada.costoZona,
    total: subtotal.restar(descuento).sumar(entrada.costoZona),
  };
}
