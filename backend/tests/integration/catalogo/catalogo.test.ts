import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { sembrarBase } from '../../../src/platform/seed/base.js';
import { sembrarCatalogo } from '../../../src/platform/seed/catalogo.js';
import { ErrorDeDominio } from '../../../src/shared-kernel/errores.js';
import { crearProducto, crearVehiculo, vaciarCatalogo } from '../../setup/fixtures.js';
import {
  crearContextoDePrueba,
  prepararBase,
  type ContextoDePrueba,
} from '../../setup/contexto.js';

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

const catalogo = () => p.ctx.servicios.catalogo;

describe('catálogo (US1)', () => {
  test('US1-06: filtros por marca y gama combinables', async () => {
    const combinaciones = [
      ['Sermat', 'reforzada'],
      ['Sermat', 'reforzada'],
      ['Sermat', 'economica'],
      ['Sermat', 'economica'],
      ['Herbo', 'reforzada'],
      ['Herbo', 'economica'],
      ['Herbo', 'economica'],
      ['Volta', 'reforzada'],
      ['Volta', 'economica'],
      ['Volta', 'economica'],
    ] as const;
    for (const [marca, gama] of combinaciones)
      await crearProducto(p.ctx.db, { marca, medida: '12x65', gama });

    const r = await catalogo().listar({
      marca: 'sermat',
      gama: 'reforzada',
      pagina: 1,
      porPagina: 24,
    });
    expect(r.total).toBe(2);
    expect(r.items.every((i) => i.marca.slug === 'sermat' && i.gama === 'reforzada')).toBe(true);

    const todos = await catalogo().listar({ pagina: 1, porPagina: 24 });
    expect(todos.total).toBe(10);
  });

  test('US1-07: sin stock → no disponible y WhatsApp con el nombre del producto', async () => {
    const prod = await crearProducto(p.ctx.db, {
      marca: 'Sermat',
      medida: '12x65',
      gama: 'economica',
      stock: 0,
      nombre: 'Sermat 12x65 Económica',
    });
    const ficha = await catalogo().obtenerFicha(prod.slug);
    expect(ficha.disponible).toBe(false);
    expect(ficha.whatsapp.mensaje).toContain('Sermat 12x65 Económica');
    const listado = await catalogo().listar({ pagina: 1, porPagina: 24 });
    expect(listado.items[0]?.disponible).toBe(false);
  });

  test('US1-08: un producto pausado da "no encontrado" y no figura en listados', async () => {
    const prod = await crearProducto(p.ctx.db, {
      marca: 'Herbo',
      medida: '12x65',
      gama: 'reforzada',
      estado: 'pausado',
    });
    await crearProducto(p.ctx.db, {
      marca: 'Herbo',
      medida: '12x65',
      gama: 'economica',
      estado: 'a_revisar',
    });
    await expect(catalogo().obtenerFicha(prod.slug)).rejects.toBeInstanceOf(ErrorDeDominio);
    expect((await catalogo().listar({ pagina: 1, porPagina: 24 })).total).toBe(0);
  });

  test('US1-09: con 10 % de descuento, $100.000 de lista → $90.000 por transferencia o efectivo', async () => {
    const prod = await crearProducto(p.ctx.db, {
      marca: 'Sermat',
      medida: '12x65',
      gama: 'economica',
      precio: 100_000,
    });
    const ficha = await catalogo().obtenerFicha(prod.slug);
    expect(ficha.precios).toEqual({
      lista: 10_000_000,
      transferenciaOEfectivo: 9_000_000,
      descuentoPct: 10,
    });
  });

  test('la ficha explica la gama, muestra el servicio incluido y los autos compatibles (FR-006, FR-007)', async () => {
    await crearVehiculo(p.ctx.db, {
      marca: 'Volkswagen',
      modelo: 'Gol Trend',
      desde: 2008,
      hasta: 2023,
      medidas: ['12x65'],
    });
    const prod = await crearProducto(p.ctx.db, {
      marca: 'Sermat',
      medida: '12x65',
      gama: 'economica',
    });
    const ficha = await catalogo().obtenerFicha(prod.slug);
    expect(ficha.explicacionGama.length).toBeGreaterThan(20);
    expect(ficha.servicioIncluido).toEqual([
      'Colocación incluida',
      'Medición del alternador',
      '18 meses de garantía', // Sermat de 12x45 a 12x75
    ]);
    expect(ficha.garantiaMeses).toBe(18);
    expect(ficha.autosCompatibles).toEqual([
      { marca: 'Volkswagen', modelo: 'Gol Trend', anioDesde: 2008, anioHasta: 2023 },
    ]);
    expect(ficha.disponible).toBe(true);
  });
});
