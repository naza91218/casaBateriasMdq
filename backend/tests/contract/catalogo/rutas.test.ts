import {
  FichaProducto,
  ListadoProductos,
  MarcaCatalogo,
  Medida,
  OpcionVehiculo,
  ResultadoCompatibles,
} from '@casa/shared';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { z } from 'zod';
import { sembrarBase } from '../../../src/platform/seed/base.js';
import { MEDIDAS, sembrarCatalogo } from '../../../src/platform/seed/catalogo.js';
import { construirServidor } from '../../../src/http/server.js';
import { crearProducto, crearVehiculo } from '../../setup/fixtures.js';
import {
  crearContextoDePrueba,
  prepararBase,
  type ContextoDePrueba,
} from '../../setup/contexto.js';

let p: ContextoDePrueba;
let app: FastifyInstance;
let slugProducto = '';

beforeAll(async () => {
  await prepararBase();
  p = crearContextoDePrueba();
  await sembrarBase(p.ctx.db, { mailAdmin: 'admin@tienda.test' });
  await sembrarCatalogo(p.ctx.db);
  await crearVehiculo(p.ctx.db, {
    marca: 'Volkswagen',
    modelo: 'Gol Trend',
    desde: 2008,
    hasta: 2023,
    medidas: ['12x65'],
  });
  slugProducto = (
    await crearProducto(p.ctx.db, { marca: 'Sermat', medida: '12x65', gama: 'economica' })
  ).slug;
  app = await construirServidor(p.ctx, { sinLimites: true });
  await app.ready();
});

afterAll(async () => {
  await app.close();
  await p.ctx.cerrar();
});

const get = (url: string) => app.inject({ method: 'GET', url: `/api/v1${url}` });

describe('contratos de catálogo y buscador', () => {
  test('GET /catalogo/marcas y /catalogo/medidas', async () => {
    const marcas = z.array(MarcaCatalogo).parse((await get('/catalogo/marcas')).json());
    expect(marcas.map((m) => m.nombre)).toEqual(['Edna', 'Herbo', 'Sermat', 'Volta']);
    const medidas = z.array(Medida).parse((await get('/catalogo/medidas')).json());
    expect(medidas.map((m) => m.codigo)).toEqual([...MEDIDAS]);
  });

  test('GET /catalogo/productos con filtros válidos e inválidos', async () => {
    const r = await get('/catalogo/productos?marca=sermat&gama=economica');
    expect(r.statusCode).toBe(200);
    expect(ListadoProductos.parse(r.json()).total).toBe(1);
    expect((await get('/catalogo/productos?gama=premium')).statusCode).toBe(400);
  });

  test('GET /catalogo/productos/:slug no expone el stock ni datos internos', async () => {
    const r = await get(`/catalogo/productos/${slugProducto}`);
    expect(r.statusCode).toBe(200);
    const ficha = FichaProducto.parse(r.json());
    expect(ficha.slug).toBe(slugProducto);
    const crudo = r.json() as Record<string, unknown>;
    for (const interno of ['stock', 'estado', 'sku', 'fuente', 'marcaId'])
      expect(crudo).not.toHaveProperty(interno);
    expect((await get('/catalogo/productos/no-existe')).statusCode).toBe(404);
  });

  test('GET /vehiculos/* responde según el contrato', async () => {
    expect(z.array(OpcionVehiculo).parse((await get('/vehiculos/marcas')).json())).toEqual([
      { nombre: 'Volkswagen', slug: 'volkswagen' },
    ]);
    expect(
      z.array(OpcionVehiculo).parse((await get('/vehiculos/modelos?marca=volkswagen')).json()),
    ).toHaveLength(1);
    expect(
      z
        .array(z.number())
        .parse((await get('/vehiculos/anios?marca=volkswagen&modelo=gol-trend')).json()),
    ).toHaveLength(16);
    const r = await get('/vehiculos/compatibles?marca=volkswagen&modelo=gol-trend&anio=2015');
    expect(ResultadoCompatibles.parse(r.json()).grupos).toHaveLength(1);
    expect(
      (await get('/vehiculos/compatibles?marca=volkswagen&modelo=gol-trend&anio=abc')).statusCode,
    ).toBe(400);
  });
});
