import { describe, expect, test } from 'vitest';
import { Dinero } from '../../../src/shared-kernel/dinero.js';

describe('Dinero', () => {
  test('se crea en centavos enteros y desde pesos', () => {
    expect(Dinero.deCentavos(10_000_000n).centavos).toBe(10_000_000n);
    expect(Dinero.dePesos('100000').centavos).toBe(10_000_000n);
    expect(Dinero.dePesos('1234.5').centavos).toBe(123_450n);
    expect(Dinero.dePesos(99.99).centavos).toBe(9_999n);
  });

  test('rechaza montos negativos o con más de dos decimales', () => {
    expect(() => Dinero.deCentavos(-1n)).toThrow();
    expect(() => Dinero.dePesos('10.123')).toThrow();
    expect(() => Dinero.dePesos('abc')).toThrow();
  });

  test('suma y resta sin quedar negativo', () => {
    const a = Dinero.dePesos(100);
    const b = Dinero.dePesos(30);
    expect(a.sumar(b).centavos).toBe(13_000n);
    expect(a.restar(b).centavos).toBe(7_000n);
    expect(() => b.restar(a)).toThrow();
  });

  test('multiplica por cantidad', () => {
    expect(Dinero.dePesos(100).por(3).centavos).toBe(30_000n);
  });

  test('porcentaje redondea al centavo más cercano (mitad hacia arriba)', () => {
    // 10 % de $100.000 = $10.000 (US1-09, US2-06)
    expect(Dinero.dePesos(100_000).porcentaje(10).centavos).toBe(1_000_000n);
    // 12,5 % de $0,99 = 12,375 centavos → 12
    expect(Dinero.deCentavos(99n).porcentaje(12.5).centavos).toBe(12n);
    // 15 % de $0,10 = 1,5 centavos → 2
    expect(Dinero.deCentavos(10n).porcentaje(15).centavos).toBe(2n);
  });

  test('compara y serializa', () => {
    expect(Dinero.dePesos(10).igual(Dinero.deCentavos(1000n))).toBe(true);
    expect(Dinero.dePesos(10).mayorQue(Dinero.dePesos(9))).toBe(true);
    expect(Dinero.cero().esCero()).toBe(true);
    expect(Dinero.dePesos(1234.5).aNumero()).toBe(123450);
  });
});
