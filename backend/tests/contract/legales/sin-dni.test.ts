import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { construirServidor } from '../../../src/http/server.js';
import { productos } from '../../../src/modules/catalogo/infrastructure/schema.js';
import { crearVehiculo } from '../../setup/fixtures.js';
import { COMPRADOR, prepararCompra, solicitud, type EscenarioCompra } from '../../setup/compra.js';

/**
 * SC-012 y FR-059: con pedidos de prueba cargados, ninguna respuesta pública (ni sus enlaces)
 * contiene el DNI, el teléfono ni la dirección del comprador. Solo el panel los ve.
 */
let e: EscenarioCompra;
let app: FastifyInstance;
const respuestas: { ruta: string; estado: number; cuerpo: string; cabeceras: string }[] = [];

const DATOS_PERSONALES = [
  COMPRADOR.dni,
  '512 3456',
  '2235123456',
  COMPRADOR.calle,
  COMPRADOR.referencias,
];

async function pedir(method: 'GET' | 'POST', url: string, payload?: object) {
  const r = await app.inject({ method, url: `/api/v1${url}`, ...(payload ? { payload } : {}) });
  respuestas.push({
    ruta: `${method} ${url}`,
    estado: r.statusCode,
    cuerpo: r.body,
    cabeceras: JSON.stringify(r.headers),
  });
  return r;
}

beforeAll(async () => {
  e = await prepararCompra();
  await e.ctx.db.update(productos).set({ stock: 100 }).where(eq(productos.id, e.productoId));
  await crearVehiculo(e.ctx.db, { marca: 'Volkswagen', modelo: 'Gol Trend', medidas: ['12x65'] });
  app = await construirServidor(e.ctx, { sinLimites: true });
  await app.ready();
});

afterAll(async () => {
  await app.close();
  await e.ctx.cerrar();
});

describe('el DNI no sale del panel (SC-012)', () => {
  test('recorre todas las rutas públicas con pedidos de cada medio y entrega', async () => {
    const [producto] = await e.ctx.db
      .select({ slug: productos.slug })
      .from(productos)
      .where(eq(productos.id, e.productoId));
    const colocacion = { entrega: 'colocacion' as const, zonaId: e.zonaMdp };

    // Compra: cotizar y crear con cada medio de pago.
    await pedir('POST', '/checkout/cotizar', {
      items: [{ productoId: e.productoId, cantidad: 1 }],
      medioPago: 'transferencia',
      ...colocacion,
    });
    const creados = [];
    // El efectivo es solo para retiro en el local (FR-022).
    for (const medioPago of ['transferencia', 'mercadopago', 'efectivo'] as const) {
      const entrega = medioPago === 'efectivo' ? {} : colocacion;
      const r = await pedir('POST', '/pedidos', solicitud(e, { medioPago, ...entrega }));
      expect(r.statusCode).toBe(201);
      creados.push(r.json<{ id: string; numero: number; urlSeguimiento: string }>());
    }

    // Seguimiento (con y sin retorno de Mercado Pago) y reintento de pago.
    for (const p of creados) {
      const token = new URL(p.urlSeguimiento).searchParams.get('t') ?? '';
      await pedir('GET', `/pedidos/${p.id}?t=${token}`);
      await pedir('GET', `/pedidos/${p.id}?t=${token}&retorno=approved`);
      await pedir('POST', `/pedidos/${p.id}/reintentar-pago?t=${token}`);
    }

    // Catálogo, buscador, configuración y formularios.
    for (const url of [
      '/configuracion/publica',
      '/catalogo/marcas',
      '/catalogo/medidas',
      '/catalogo/productos',
      `/catalogo/productos/${producto?.slug}`,
      '/vehiculos/marcas',
      '/vehiculos/modelos?marca=volkswagen',
      '/vehiculos/anios?marca=volkswagen&modelo=gol-trend',
      '/vehiculos/compatibles?marca=volkswagen&modelo=gol-trend',
      '/auth/sesion',
    ]) {
      await pedir('GET', url);
    }
    await pedir('POST', '/arrepentimiento', {
      numeroPedido: creados[0]?.numero,
      nombre: COMPRADOR.nombre,
      email: COMPRADOR.email,
    });
    await pedir('POST', '/auth/enlace', { email: COMPRADOR.email });
    // Errores de validación: no devuelven lo que se mandó.
    await pedir('POST', '/pedidos', { ...solicitud(e), comprador: { ...COMPRADOR, email: 'mal' } });

    // Que cada ruta haya respondido de verdad: un 404 o un 500 no prueba nada.
    const fallidas = respuestas
      .filter((r) => r.estado === 404 || r.estado >= 500)
      .map((r) => `${r.estado} ${r.ruta}`);
    expect(fallidas).toEqual([]);
    expect(respuestas.length).toBeGreaterThan(20);
    for (const { ruta, cuerpo, cabeceras } of respuestas) {
      for (const dato of DATOS_PERSONALES) {
        expect(`${cuerpo}\n${cabeceras}`, `${ruta} contiene "${dato}"`).not.toContain(dato);
      }
    }
  });
});
