import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { sembrarBase } from '../../../db/seed/base.js';
import { sembrarCatalogo } from '../../../db/seed/catalogo.js';
import { crearProducto, crearVehiculo, vaciarCatalogo } from '../../setup/fixtures.js';
import { crearContextoDePrueba, prepararBase, type ContextoDePrueba } from '../../setup/contexto.js';

let p: ContextoDePrueba;

beforeAll(async () => {
  await prepararBase();
  p = crearContextoDePrueba();
  await sembrarBase(p.ctx.db, { mailAdmin: 'admin@tienda.test' });
  await sembrarCatalogo(p.ctx.db);
});

afterAll(async () => {
  await p.ctx.cerrar();
});

beforeEach(async () => {
  await vaciarCatalogo(p.ctx.db);
});

const buscador = () => p.ctx.servicios.buscador;

describe('buscador por auto (US1)', () => {
  test('US1-01: Gol Trend 2015 muestra las dos 12x65, la económica primero', async () => {
    await crearVehiculo(p.ctx.db, { marca: 'Volkswagen', modelo: 'Gol Trend', desde: 2008, hasta: 2023, medidas: ['12x65'] });
    await crearProducto(p.ctx.db, { marca: 'Herbo', medida: '12x65', gama: 'reforzada', nombre: 'Herbo 12x65 Reforzada' });
    await crearProducto(p.ctx.db, { marca: 'Sermat', medida: '12x65', gama: 'economica', nombre: 'Sermat 12x65 Económica' });
    await crearProducto(p.ctx.db, { marca: 'Volta', medida: '12x75', gama: 'economica' }); // otra medida

    const r = await buscador().compatibles('volkswagen', 'gol-trend', 2015);

    expect(r.sinResultados).toBeNull();
    expect(r.medidas).toEqual(['12x65']);
    expect(r.grupos.map((g) => g.gama)).toEqual(['economica', 'reforzada']);
    expect(r.grupos[0]?.productos.map((x) => x.nombre)).toEqual(['Sermat 12x65 Económica']);
    expect(r.grupos[1]?.productos.map((x) => x.nombre)).toEqual(['Herbo 12x65 Reforzada']);
  });

  test('US1-02: un año fuera del rango no figura entre las opciones', async () => {
    await crearVehiculo(p.ctx.db, { marca: 'Volkswagen', modelo: 'Gol Trend', desde: 2008, hasta: 2023, medidas: ['12x65'] });
    const anios = await buscador().anios('volkswagen', 'gol-trend');
    expect(anios).toContain(2015);
    expect(anios).not.toContain(2005);
    expect(anios[0]).toBe(2023); // más nuevo primero
    expect(anios).toHaveLength(16);
  });

  test('cada paso muestra solo opciones con datos (FR-010)', async () => {
    await crearVehiculo(p.ctx.db, { marca: 'Volkswagen', modelo: 'Gol Trend', desde: 2008, hasta: 2023, medidas: ['12x65'] });
    await crearVehiculo(p.ctx.db, { marca: 'Fiat', modelo: 'Sin Medida', desde: 2010, hasta: 2012, medidas: [] });
    expect((await buscador().marcas()).map((m) => m.slug)).toEqual(['volkswagen']);
    expect((await buscador().modelos('volkswagen')).map((m) => m.nombre)).toEqual(['Gol Trend']);
  });

  test('US1-03: auto no cargado → aviso y WhatsApp con marca, modelo y año', async () => {
    const r = await buscador().compatibles('renault', 'clio-mio', 2014);
    expect(r.sinResultados).toBe('auto_no_cargado');
    expect(r.grupos).toEqual([]);
    expect(r.whatsapp.mensaje).toBe('Hola, busco batería para un Renault Clio Mio 2014');
    expect(r.whatsapp.url).toContain(encodeURIComponent('Hola, busco batería para un Renault Clio Mio 2014'));
  });

  test('US1-04: sin stock de la medida → "sin_stock" y WhatsApp', async () => {
    await crearVehiculo(p.ctx.db, { marca: 'Volkswagen', modelo: 'Gol Trend', desde: 2008, hasta: 2023, medidas: ['12x65'] });
    await crearProducto(p.ctx.db, { marca: 'Sermat', medida: '12x65', gama: 'economica', stock: 0 });
    await crearProducto(p.ctx.db, { marca: 'Herbo', medida: '12x65', gama: 'reforzada', estado: 'pausado' });

    const r = await buscador().compatibles('volkswagen', 'gol-trend', 2015);
    expect(r.sinResultados).toBe('sin_stock');
    expect(r.whatsapp.mensaje).toBe('Hola, busco batería para un Volkswagen Gol Trend 2015');
  });

  test('un auto con dos medidas muestra las baterías de ambas', async () => {
    await crearVehiculo(p.ctx.db, { marca: 'Toyota', modelo: 'Hilux', desde: 2016, hasta: 2024, medidas: ['12x90', '12x110'] });
    await crearProducto(p.ctx.db, { marca: 'Sermat', medida: '12x90', gama: 'economica' });
    await crearProducto(p.ctx.db, { marca: 'Edna', medida: '12x110', gama: 'reforzada' });
    const r = await buscador().compatibles('toyota', 'hilux', 2020);
    expect(r.medidas).toEqual(['12x90', '12x110']);
    expect(r.grupos.flatMap((g) => g.productos)).toHaveLength(2);
  });
});
