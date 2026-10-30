import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { consultasCanje } from '../../../src/modules/canje/infrastructure/schema.js';
import { prepararCompra, type EscenarioCompra } from '../../setup/compra.js';

let e: EscenarioCompra;

beforeAll(async () => {
  e = await prepararCompra();
});

afterAll(async () => {
  await e.ctx.cerrar();
});

describe('consulta de canje (FR-004, clarify)', () => {
  test('se guarda para el panel y devuelve WhatsApp con el resumen', async () => {
    const r = await e.ctx.servicios.canje.registrar({
      nombre: 'Juan Gómez',
      telefono: '223 400 1122',
      bateriaUsada: 'Moura 12x65',
      auto: 'Gol Trend 2015',
      localidad: 'Mar del Plata',
    });
    expect(r.whatsapp.mensaje).toContain('canje de mi batería usada');
    expect(r.whatsapp.mensaje).toContain('Gol Trend 2015');
    const filas = await e.ctx.db.select().from(consultasCanje);
    expect(filas).toHaveLength(1);
    expect(filas[0]?.estado).toBe('pendiente');
  });

  test('fuera de Mar del Plata o de las zonas atendidas → mensaje claro', async () => {
    await expect(
      e.ctx.servicios.canje.registrar({
        nombre: 'Ana',
        telefono: '341 400 1122',
        localidad: 'Rosario',
      }),
    ).rejects.toMatchObject({
      campos: { localidad: 'Por ahora el canje es solo en Mar del Plata' },
    });
  });
});
