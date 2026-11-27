import { Writable } from 'node:stream';
import { describe, expect, test } from 'vitest';
import { crearLogger } from '../../../src/platform/logger.js';

function capturar() {
  const lineas: string[] = [];
  const destino = new Writable({
    write(chunk, _enc, cb) {
      lineas.push(chunk.toString());
      cb();
    },
  });
  return { lineas, destino };
}

describe('logger con datos personales ocultos', () => {
  test('oculta dni, direccion, calle, telefono, email y nombre en cualquier nivel', () => {
    const { lineas, destino } = capturar();
    const logger = crearLogger({ nivel: 'info', destino });
    logger.info(
      {
        dni: '30123456',
        comprador: {
          nombre: 'Laura Pérez',
          email: 'laura@example.com',
          telefono: '2235123456',
          direccion: 'Colón 1234',
          calle: 'Colón',
        },
        body: { comprador: { dni: '30123456' } },
        pedido: { numero: 1048 },
      },
      'pedido creado',
    );
    const salida = lineas.join('');
    for (const dato of ['30123456', 'Laura', 'laura@example.com', '2235123456', 'Colón']) {
      expect(salida).not.toContain(dato);
    }
    expect(salida).toContain('1048');
    expect(salida).toContain('[oculto]');
  });
});
