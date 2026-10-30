import { describe, expect, test } from 'vitest';
import {
  errorSinDatosPersonales,
  sinDatosPersonales,
} from '../../../src/shared-kernel/privacidad.js';

describe('datos personales en textos libres (FR-059)', () => {
  test('tapa mails, DNI y teléfonos en cualquier formato', () => {
    expect(sinDatosPersonales('no se pudo mandar a laura.perez+1@gmail.com')).toBe(
      'no se pudo mandar a [mail]',
    );
    for (const numero of [
      '30123456',
      '30.123.456',
      '2235123456',
      '223 512 3456',
      '0223-15-512-3456',
    ]) {
      expect(sinDatosPersonales(`valor ${numero} rechazado`)).toBe('valor [número] rechazado');
    }
  });

  test('deja lo que no es un dato personal: números cortos, ids, rutas y líneas de la traza', () => {
    const texto =
      'pedido #1048 total 90000 id 01a18cf8-8068-75e7-9607-979bf839cebb en Colón 1234 at crear (src/x.ts:120:15)';
    expect(sinDatosPersonales(texto)).toBe(texto);
  });

  test('la copia del error no lleva las propiedades extra del original', () => {
    const original = Object.assign(new TypeError('falló con 30123456'), {
      detail: 'fila (Laura, 30123456)',
      parameters: ['Laura'],
    });
    const limpio = errorSinDatosPersonales(original);
    expect(limpio.name).toBe('TypeError');
    expect(limpio.message).toBe('falló con [número]');
    expect(JSON.parse(JSON.stringify(limpio))).toEqual({ name: 'TypeError' });
    expect(limpio.stack).not.toContain('30123456');
  });
});
