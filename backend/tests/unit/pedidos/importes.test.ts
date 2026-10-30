import { describe, expect, test } from 'vitest';
import { mediosDisponibles, MEDIOS_PAGO } from '../../../src/modules/pagos/domain/medios-pago.js';
import { calcularImportes } from '../../../src/modules/pedidos/domain/importes.js';
import { Dinero } from '../../../src/shared-kernel/dinero.js';
import { HORA, MINUTO } from '../../../src/shared-kernel/reloj.js';

const pesos = (n: number) => Dinero.dePesos(n);

describe('importes del pedido (FR-019)', () => {
  test('US2-06: con 10 % de descuento, $100.000 → $90.000', () => {
    const r = calcularImportes({
      lineas: [{ precioUnitario: pesos(100_000), cantidad: 1 }],
      descuentoPct: 10,
      aplicaDescuento: true,
      costoZona: Dinero.cero(),
    });
    expect(r.subtotal.aNumero()).toBe(10_000_000);
    expect(r.descuento.aNumero()).toBe(1_000_000);
    expect(r.total.aNumero()).toBe(9_000_000);
  });

  test('Mercado Pago no tiene descuento', () => {
    const r = calcularImportes({
      lineas: [{ precioUnitario: pesos(100_000), cantidad: 2 }],
      descuentoPct: 10,
      aplicaDescuento: false,
      costoZona: Dinero.cero(),
    });
    expect(r.total.aNumero()).toBe(20_000_000);
  });

  test('US2-15: la zona Batán suma $5.000 desglosado', () => {
    const r = calcularImportes({
      lineas: [{ precioUnitario: pesos(100_000), cantidad: 1 }],
      descuentoPct: 10,
      aplicaDescuento: false,
      costoZona: pesos(5_000),
    });
    expect(r.costoZona.aNumero()).toBe(500_000);
    expect(r.total.aNumero()).toBe(10_500_000);
  });

  test('el descuento por unidad coincide con el precio que muestra la ficha', () => {
    // 3 × $99.999,99 con 12,5 %: el descuento por unidad redondea igual que en la ficha.
    const unidad = Dinero.dePesos('99999.99');
    const r = calcularImportes({
      lineas: [{ precioUnitario: unidad, cantidad: 3 }],
      descuentoPct: 12.5,
      aplicaDescuento: true,
      costoZona: Dinero.cero(),
    });
    const precioFicha = unidad.restar(unidad.porcentaje(12.5));
    expect(r.total.aNumero()).toBe(precioFicha.por(3).aNumero());
  });
});

describe('medios de pago (FR-022, clarify)', () => {
  test('US2-05: sin efectivo cuando hay colocación', () => {
    expect(mediosDisponibles('colocacion')).toEqual(['mercadopago', 'transferencia']);
    expect(mediosDisponibles('retiro')).toEqual(['mercadopago', 'transferencia', 'efectivo']);
  });

  test('vencimientos: MP 30 min, transferencia 48 h, efectivo no vence', () => {
    const creado = new Date('2026-11-01T12:00:00Z');
    const plazos = { minutosVencMercadopago: 30, horasVencTransferencia: 48 };
    expect(MEDIOS_PAGO.mercadopago.vencimiento(creado, plazos)?.getTime()).toBe(
      creado.getTime() + 30 * MINUTO,
    );
    expect(MEDIOS_PAGO.transferencia.vencimiento(creado, plazos)?.getTime()).toBe(
      creado.getTime() + 48 * HORA,
    );
    expect(MEDIOS_PAGO.efectivo.vencimiento(creado, plazos)).toBeNull();
    expect(MEDIOS_PAGO.efectivo.estadoInicial).toBe('a_pagar_en_local');
  });
});
