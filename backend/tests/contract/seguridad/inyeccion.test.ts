import { eq, sql } from 'drizzle-orm';
import type { FastifyInstance, InjectOptions } from 'fastify';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { construirServidor } from '../../../src/http/server.js';
import { consultasCanje } from '../../../src/modules/canje/infrastructure/schema.js';
import { productos } from '../../../src/modules/catalogo/infrastructure/schema.js';
import { pedidoCompradores } from '../../../src/modules/clientes/infrastructure/schema.js';
import { outboxMensajes } from '../../../src/modules/notificaciones/infrastructure/schema.js';
import { renderizar } from '../../../src/modules/notificaciones/plantillas/index.js';
import { COMPRADOR, prepararCompra, type EscenarioCompra } from '../../setup/compra.js';

/**
 * Cargas típicas de inyección SQL. Todas las consultas van parametrizadas (Drizzle) y las
 * entradas se validan con Zod: cada carga tiene que terminar en 400/404 o guardarse como texto
 * literal; nunca en 500, en una demora (pg_sleep) ni en datos de más.
 */
const CARGAS = [
  "' OR '1'='1",
  "' OR 1=1 --",
  "'; DROP TABLE pedidos; --",
  "1; SELECT pg_sleep(3) --",
  "' UNION SELECT dni_cifrado::text FROM pedido_compradores --",
  "%' OR '%'='",
  '" OR ""="',
  "\\'; DELETE FROM productos; --",
  '$1::text',
];

const DEMORA_MAXIMA_MS = 1500;

let e: EscenarioCompra;
let app: FastifyInstance;

beforeAll(async () => {
  e = await prepararCompra();
  await e.ctx.db.update(productos).set({ stock: 100 }).where(eq(productos.id, e.productoId));
  app = await construirServidor(e.ctx, { sinLimites: true });
  await app.ready();
});

afterAll(async () => {
  await app.close();
  await e.ctx.cerrar();
});

async function medir(pedido: InjectOptions) {
  const inicio = performance.now();
  const r = await app.inject(pedido);
  return { r, ms: performance.now() - inicio };
}

const q = encodeURIComponent;

describe.each(CARGAS)('carga %s', (carga) => {
  test('en filtros y rutas de lectura: 400 o 404 o vacío, nunca 500 ni demora', async () => {
    const urls = [
      `/api/v1/catalogo/productos?marca=${q(carga)}`,
      `/api/v1/catalogo/productos/${q(carga)}`,
      `/api/v1/vehiculos/modelos?marca=${q(carga)}`,
      `/api/v1/vehiculos/anios?marca=gol&modelo=${q(carga)}`,
      `/api/v1/vehiculos/compatibles?marca=${q(carga)}&modelo=gol&anio=2015`,
      `/api/v1/pedidos/${q(carga)}?t=x`,
      `/api/v1/pedidos/0190a0a0-0000-7000-8000-000000000000?t=${q(carga)}`,
    ];
    for (const url of urls) {
      const { r, ms } = await medir({ method: 'GET', url });
      expect(r.statusCode, url).toBeLessThan(500);
      expect(ms, url).toBeLessThan(DEMORA_MAXIMA_MS);
      if (r.statusCode === 200) {
        // Un filtro de marca inyectado no puede devolver el catálogo entero.
        const cuerpo = r.json();
        if ('items' in cuerpo) expect(cuerpo.items, url).toEqual([]);
      }
    }
  });

  test('en el login: no se envía ningún enlace', async () => {
    const antes = await e.ctx.db.select().from(outboxMensajes).where(eq(outboxMensajes.evento, 'enlace_ingreso'));
    for (const email of [carga, `admin@tienda.test${carga}`, `${carga}@tienda.test`]) {
      const { r, ms } = await medir({ method: 'POST', url: '/api/v1/auth/enlace', payload: { email } });
      expect([202, 400]).toContain(r.statusCode);
      expect(ms).toBeLessThan(DEMORA_MAXIMA_MS);
    }
    const despues = await e.ctx.db.select().from(outboxMensajes).where(eq(outboxMensajes.evento, 'enlace_ingreso'));
    expect(despues).toHaveLength(antes.length);
  });

  test('en el panel sin sesión: siempre 401', async () => {
    const { r } = await medir({ method: 'GET', url: `/api/v1/admin/pedidos?estado=${q(carga)}`, cookies: { sesion: carga } });
    expect(r.statusCode).toBe(401);
  });

  test('en campos de texto libre de un pedido: se guarda tal cual, como texto', async () => {
    const { r, ms } = await medir({
      method: 'POST',
      url: '/api/v1/pedidos',
      payload: {
        items: [{ productoId: e.productoId, cantidad: 1 }],
        entrega: 'colocacion',
        zonaId: e.zonaMdp,
        medioPago: 'transferencia',
        comprador: { ...COMPRADOR, nombre: `Ana ${carga}`, calle: `Colón ${carga}`.slice(0, 120), referencias: carga },
      },
    });
    expect(r.statusCode).toBe(201);
    expect(ms).toBeLessThan(DEMORA_MAXIMA_MS);
    const [c] = await e.ctx.db.select().from(pedidoCompradores).where(eq(pedidoCompradores.pedidoId, r.json().id));
    expect(c).toMatchObject({ nombre: `Ana ${carga}`, referencias: carga });
  });

  test('en el DNI: se rechaza por formato', async () => {
    const r = await app.inject({
      method: 'POST',
      url: '/api/v1/pedidos',
      payload: { items: [{ productoId: e.productoId, cantidad: 1 }], entrega: 'retiro', medioPago: 'transferencia', comprador: { ...COMPRADOR, dni: carga } },
    });
    expect(r.statusCode).toBe(400);
  });

  test('en la consulta de canje: se guarda tal cual, como texto', async () => {
    const { r } = await medir({
      method: 'POST',
      url: '/api/v1/consultas-canje',
      payload: { nombre: `Juan ${carga}`, telefono: '223 400 1122', bateriaUsada: carga, localidad: 'Mar del Plata' },
    });
    expect(r.statusCode).toBe(201);
    const filas = await e.ctx.db.select().from(consultasCanje).where(eq(consultasCanje.nombre, `Juan ${carga}`));
    expect(filas).toEqual([expect.objectContaining({ bateriaUsada: carga })]);
  });
});

describe('después de todas las cargas', () => {
  test('las tablas siguen ahí y con datos', async () => {
    const [p] = await e.ctx.db.execute<{ n: number }>(sql`select count(*)::int as n from pedidos`);
    const [prod] = await e.ctx.db.execute<{ n: number }>(sql`select count(*)::int as n from productos`);
    expect(p?.n).toBeGreaterThan(0);
    expect(prod?.n).toBeGreaterThan(0);
  });
});

describe('HTML en los mails', () => {
  test('un nombre con <script> llega escapado, nunca como HTML', async () => {
    const mail = await renderizar('pedido_recibido', {
      nombre: '<script>alert(1)</script>',
      numero: 1001,
      entrega: 'retiro',
      total: 9_000_000,
      items: [{ nombre: '<img src=x onerror=alert(1)>', cantidad: 1, precioUnitario: 9_000_000 }],
      urlSeguimiento: 'http://tienda.test/pedido/1',
      whatsappUrl: 'https://wa.me/',
      banco: null,
    });
    expect(mail.html).not.toContain('<script>');
    expect(mail.html).not.toContain('<img');
    expect(mail.html).toContain('&lt;script&gt;');
  });
});
