import { describe, expect, test } from 'vitest';
import {
  garantiaPorDefecto,
  servicioIncluido,
} from '../../../src/modules/catalogo/domain/precios.js';

describe('garantía por defecto (reunión 2026-11-17)', () => {
  test.each([
    ['Sermat', '12x45', 18],
    ['Sermat', '12x65', 18],
    ['sermat', '12x75', 18],
    ['Sermat', '12x40', 12],
    ['Sermat', '12x90 alta', 12],
    ['Herbo', '12x65', 12],
    ['Volta', '12x75', 12],
    ['Edna', '12x50', 12],
  ])('%s %s → %i meses', (marca, medida, meses) => {
    expect(garantiaPorDefecto(marca, medida)).toBe(meses);
  });

  test('el servicio incluido dice los meses de esa batería', () => {
    expect(servicioIncluido(18)).toContain('18 meses de garantía');
  });
});
