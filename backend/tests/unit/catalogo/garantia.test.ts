import { describe, expect, test } from 'vitest';
import {
  garantiaPorDefecto,
  servicioIncluido,
} from '../../../src/modules/catalogo/domain/precios.js';

describe('garantía por defecto (Mateo, 2026-11-27)', () => {
  test.each([
    ['Sermat', 18],
    [' sermat ', 18],
    ['Herbo', 12],
    ['Volta', 12],
    ['Edna', 12],
  ])('%s → %i meses', (marca, meses) => {
    expect(garantiaPorDefecto(marca)).toBe(meses);
  });

  test('el servicio incluido dice los meses de esa batería', () => {
    expect(servicioIncluido(18)).toContain('18 meses de garantía');
  });
});
