import { describe, expect, test } from 'vitest';
import { telefonoArgentino } from '../../../src/shared-kernel/whatsapp.js';

describe('telefonoArgentino', () => {
  test.each([
    ['223 512 3456', '5492235123456'],
    ['0223 15-512 3456', '5492235123456'],
    ['(0223) 155123456', '5492235123456'],
    ['11 15 4000 1122', '5491140001122'],
    ['+54 9 223 512 3456', '5492235123456'],
    ['+54 223 512 3456', '5492235123456'],
    ['2266 15 401122', '5492266401122'],
  ])('%s → %s', (entrada, salida) => {
    expect(telefonoArgentino(entrada)).toBe(salida);
  });
});
