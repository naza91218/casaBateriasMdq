import { ConfiguracionPublica, ErrorRespuesta, IndiceSeo, PaginaVehiculo } from '@casa/shared';
import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { construirServidor } from '../../../src/http/server.js';
import { configuracion } from '../../../src/modules/configuracion/infrastructure/schema.js';
import { zonasColocacion } from '../../../src/modules/entregas/infrastructure/schema.js';
import { crearProducto, crearVehiculo } from '../../setup/fixtures.js';
import { prepararCompra, type EscenarioCompra } from '../../setup/compra.js';

let e: EscenarioCompra;
let app: FastifyInstance;

beforeAll(async () => {
  e = await prepararCompra();
  // El escenario trae una Sermat 12x65 económica activa de $100.000 (10 % menos con transferencia).
  await crearProducto(e.ctx.db, {
    marca: 'Sermat',
    medida: '12x70',
    gama: 'reforzada',
    precio: 150_000,
    nombre: 'Sermat 12x70 Reforzada',
  });
  await crearProducto(e.ctx.db, {
    marca: 'Sermat',
    medida: '12x65',
    gama: 'reforzada',
    estado: 'pausado',
    nombre: 'Pausada 12x65',
  });
  await crearProducto(e.ctx.db, {
    marca: 'Sermat',
    medida: '12x65',
    gama: 'reforzada',
    estado: 'a_revisar',
    nombre: 'A revisar 12x65',
  });

  await crearVehiculo(e.ctx.db, {
    marca: 'Volkswagen',
    modelo: 'Gol Trend',
    desde: 2008,
    hasta: 2012,
    medidas: ['12x65'],
  });
  await crearVehiculo(e.ctx.db, {
    marca: 'Volkswagen',
    modelo: 'Gol Trend',
    desde: 2013,
    hasta: 2016,
    medidas: ['12x70', '12x65'],
  });
  await crearVehiculo(e.ctx.db, { marca: 'Fiat', modelo: 'Palio', medidas: ['12x65'] });
  await crearVehiculo(e.ctx.db, {
    marca: 'Ford',
    modelo: 'Ranger',
    motor: '3.0 TD',
    medidas: ['12x90 alta'],
  });
  await crearVehiculo(e.ctx.db, {
    marca: 'Ford',
    modelo: 'Ranger',
    motor: '2.3',
    medidas: ['12x75'],
  });
  // Una versión sin años vale para todos los años, también los del rango (clarify 2026-10-30).
  await crearVehiculo(e.ctx.db, { marca: 'Chevrolet', modelo: 'Corsa', medidas: ['12x65'] });
  await crearVehiculo(e.ctx.db, {
    marca: 'Chevrolet',
    modelo: 'Corsa',
    desde: 2001,
    hasta: 2012,
    medidas: ['12x70'],
  });
  await crearVehiculo(e.ctx.db, {
    marca: 'Chevrolet',
    modelo: 'Celta',
    medidas: ['12x65', '12x70'],
  });
  await crearVehiculo(e.ctx.db, {
    marca: 'Chevrolet',
    modelo: 'Celta',
    desde: 2001,
    hasta: 2012,
    medidas: ['12x65'],
  });

  await e.ctx.db
    .insert(zonasColocacion)
    .values([{ nombre: 'Batán' }, { nombre: 'Miramar', activa: false }]);
  await e.ctx.db
    .update(configuracion)
    .set({
      comercioRazonSocial: 'La Casa de las Baterías SRL',
      comercioCuit: '30-71234567-8',
      comercioTelefono: '223 512 3456',
    })
    .where(eq(configuracion.id, 1));

  app = await construirServidor(e.ctx, { sinLimites: true });
  await app.ready();
});

afterAll(async () => {
  await app.close();
  await e.ctx.cerrar();
});

const get = (url: string) => app.inject({ method: 'GET', url: `/api/v1${url}` });

describe('GET /seo/indice (FR-055, FR-074)', () => {
  test('US6-04: solo productos activos y modelos con compatibilidad, con fecha', async () => {
    const r = await get('/seo/indice');
    expect(r.statusCode).toBe(200);
    const indice = IndiceSeo.parse(r.json());

    const nombres = indice.productos.map((p) => p.nombre);
    expect(nombres).toContain('Sermat 12x70 Reforzada');
    expect(nombres).not.toContain('Pausada 12x65');
    expect(nombres).not.toContain('A revisar 12x65');

    expect(indice.modelos.map((m) => `${m.marca.slug}/${m.modelo.slug}`)).toEqual([
      'chevrolet/celta',
      'chevrolet/corsa',
      'fiat/palio',
      'ford/ranger',
      'volkswagen/gol-trend',
    ]);
    for (const fecha of [...indice.productos, ...indice.modelos].map((x) => x.actualizadoEn)) {
      expect(Date.parse(fecha)).toBeGreaterThan(Date.parse('2026-01-01'));
    }
  });
});

describe('GET /vehiculos/:marca/:modelo (FR-072)', () => {
  test('US6-07: medidas por rango de años y la primera pregunta responde la medida', async () => {
    const r = await get('/vehiculos/volkswagen/gol-trend');
    expect(r.statusCode).toBe(200);
    const p = PaginaVehiculo.parse(r.json());

    expect(p.marca).toEqual({ nombre: 'Volkswagen', slug: 'volkswagen' });
    expect(p.modelo).toEqual({ nombre: 'Gol Trend', slug: 'gol-trend' });
    expect(p.medidas).toEqual(['12x65', '12x70']);
    expect(p.tabla).toEqual([
      { anioDesde: 2008, anioHasta: 2012, motor: null, medidas: ['12x65'] },
      { anioDesde: 2013, anioHasta: 2016, motor: null, medidas: ['12x65', '12x70'] },
    ]);
    expect(p.respuesta).toBe(
      'La batería del Volkswagen Gol Trend depende del año: de 2008 a 2012, 12x65; de 2013 a 2016, 12x65 o 12x70.',
    );
    expect(p.preguntas[0]).toEqual({
      pregunta: '¿Qué batería lleva el Volkswagen Gol Trend?',
      respuesta: p.respuesta,
    });

    // Baterías activas con stock de esas medidas, económica primero; nunca las pausadas.
    expect(p.grupos.map((g) => g.gama)).toEqual(['economica', 'reforzada']);
    expect(p.grupos.flatMap((g) => g.productos.map((x) => x.nombre))).not.toContain(
      'Pausada 12x65',
    );

    const textos = p.preguntas.map((q) => q.respuesta).join('\n');
    expect(textos).toContain(
      'Desde $90.000 pagando con transferencia o efectivo ($100.000 con Mercado Pago)',
    );
    expect(textos).toContain('incluida en Mar del Plata y también vamos a Batán.');
    expect(textos).not.toContain('Miramar');
    expect(textos).toContain('garantía de hasta 18 meses, según la marca y la medida');
    expect(p.whatsapp.mensaje).toBe('Hola, busco batería para un Volkswagen Gol Trend');
  });

  test('un modelo que lleva siempre lo mismo responde en una oración', async () => {
    const p = PaginaVehiculo.parse((await get('/vehiculos/fiat/palio')).json());
    expect(p.respuesta).toBe('El Fiat Palio lleva una batería 12x65.');
    expect(p.tabla).toEqual([
      { anioDesde: null, anioHasta: null, motor: null, medidas: ['12x65'] },
    ]);
  });

  test('si cambia según el motor, lo dice', async () => {
    const p = PaginaVehiculo.parse((await get('/vehiculos/ford/ranger')).json());
    expect(p.respuesta).toBe(
      'La batería del Ford Ranger depende del motor: con motor 2.3, 12x75; con motor 3.0 TD, 12x90 alta.',
    );
    // Sin baterías de esas medidas: el precio se consulta por WhatsApp.
    expect(p.grupos).toEqual([]);
    expect(p.preguntas[1]?.respuesta).toContain('WhatsApp');
  });

  test('una versión sin años suma sus medidas a cada rango, igual que el buscador', async () => {
    const corsa = PaginaVehiculo.parse((await get('/vehiculos/chevrolet/corsa')).json());
    expect(corsa.respuesta).toBe(
      'La batería del Chevrolet Corsa depende del año: de 2001 a 2012, 12x65 o 12x70; en los demás años, 12x65.',
    );
    const buscador = (
      await get('/vehiculos/compatibles?marca=chevrolet&modelo=corsa&anio=2005')
    ).json();
    expect(buscador.medidas).toEqual(corsa.tabla.find((f) => f.anioDesde === 2001)?.medidas);

    // Si con eso todas las versiones quedan iguales, alcanza con una oración.
    const celta = PaginaVehiculo.parse((await get('/vehiculos/chevrolet/celta')).json());
    expect(celta.respuesta).toBe('El Chevrolet Celta lleva una batería 12x65 o 12x70.');
  });

  test('un modelo que no está cargado → 404; un slug inválido → 400', async () => {
    const r = await get('/vehiculos/volkswagen/no-existe');
    expect(r.statusCode).toBe(404);
    expect(ErrorRespuesta.parse(r.json()).error.mensaje).toBe(
      'Todavía no tenemos cargado ese modelo',
    );
    expect((await get('/vehiculos/Volkswagen/Gol%20Trend')).statusCode).toBe(400);
  });
});

describe('GET /configuracion/publica (FR-073)', () => {
  test('zonas atendidas activas y los datos del comercio tal cual están cargados', async () => {
    const c = ConfiguracionPublica.parse((await get('/configuracion/publica')).json());
    expect(c.zonas.map((z) => z.nombre)).toEqual(['Batán', 'Mar del Plata']);
    expect(c.comercio).toMatchObject({
      razonSocial: 'La Casa de las Baterías SRL',
      cuit: '30-71234567-8',
      domicilio: 'Av. Juan B. Justo 5766, Mar del Plata',
      telefono: '223 512 3456',
    });
  });
});
