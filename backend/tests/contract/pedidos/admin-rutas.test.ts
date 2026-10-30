import {
  Alerta,
  ErrorRespuesta,
  ListaPedidosAdmin,
  PedidoDetalleAdmin,
  ResumenAdmin,
} from '@casa/shared';
import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { construirServidor } from '../../../src/http/server.js';
import { productos } from '../../../src/modules/catalogo/infrastructure/schema.js';
import { alertas } from '../../../src/modules/pagos/infrastructure/schema.js';
import { DIA } from '../../../src/shared-kernel/reloj.js';
import { COMPRADOR, prepararCompra, solicitud, type EscenarioCompra } from '../../setup/compra.js';
import { cookieDeAdmin } from '../../setup/sesion.js';

let e: EscenarioCompra;
let app: FastifyInstance;
let cookies: { sesion: string };

beforeAll(async () => {
  e = await prepararCompra();
  await e.ctx.db.update(productos).set({ stock: 100 }).where(eq(productos.id, e.productoId));
  app = await construirServidor(e.ctx, { sinLimites: true });
  await app.ready();
  cookies = await cookieDeAdmin(e.ctx);
});

afterAll(async () => {
  await app.close();
  await e.ctx.cerrar();
});

const get = (url: string) => app.inject({ method: 'GET', url: `/api/v1/admin${url}`, cookies });
const post = (url: string, payload?: object) =>
  app.inject({
    method: 'POST',
    url: `/api/v1/admin${url}`,
    cookies,
    ...(payload ? { payload } : {}),
  });

describe('el panel exige sesión (FR-041)', () => {
  const id = '0190a0a0-0000-7000-8000-000000000000';
  test.each([
    ['GET', '/resumen'],
    ['GET', '/pedidos'],
    ['GET', `/pedidos/${id}`],
    ['POST', `/pedidos/${id}/confirmar-transferencia`],
    ['POST', `/pedidos/${id}/registrar-efectivo`],
    ['POST', `/pedidos/${id}/estado`],
    ['GET', '/alertas'],
    ['POST', `/alertas/${id}/resolver`],
  ] as const)('%s %s sin sesión → 401', async (method, url) => {
    const r = await app.inject({
      method,
      url: `/api/v1/admin${url}`,
      payload: method === 'POST' ? {} : undefined,
    });
    expect(r.statusCode).toBe(401);
    expect(ErrorRespuesta.parse(r.json()).error.codigo).toBe('SIN_SESION');
  });

  test('con una cookie inventada → 401', async () => {
    const r = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/pedidos',
      cookies: { sesion: 'inventada' },
    });
    expect(r.statusCode).toBe(401);
  });
});

describe('pedidos en el panel', () => {
  test('US3-05: el listado no trae DNI; el detalle sí, con mapa y WhatsApp al comprador', async () => {
    const { id } = await e.ctx.servicios.pedidos.crear(
      solicitud(e, { entrega: 'colocacion', zonaId: e.zonaMdp }),
    );

    const lista = await get('/pedidos');
    expect(lista.statusCode).toBe(200);
    ListaPedidosAdmin.parse(lista.json());
    expect(lista.body).not.toContain(COMPRADOR.dni);

    const r = await get(`/pedidos/${id}`);
    expect(r.statusCode).toBe(200);
    const d = PedidoDetalleAdmin.parse(r.json());
    expect(d.comprador.dni).toBe(COMPRADOR.dni);
    expect(d.mapaUrl).toBe(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('Colón 1234, Mar del Plata')}`,
    );
    expect(d.whatsapp?.url).toMatch(/^https:\/\/wa\.me\/5492235123456\?text=/);
    expect(d.whatsapp?.mensaje).toContain(`#${d.numero}`);
    expect(d.transicionesPermitidas).toEqual(['cancelado']);
  });

  test('retiro en el local: sin link al mapa', async () => {
    const { id } = await e.ctx.servicios.pedidos.crear(solicitud(e));
    expect(PedidoDetalleAdmin.parse((await get(`/pedidos/${id}`)).json()).mapaUrl).toBeNull();
  });

  test('pedido inexistente → 404', async () => {
    expect((await get('/pedidos/0190a0a0-0000-7000-8000-000000000000')).statusCode).toBe(404);
  });

  test('confirmar transferencia devuelve el detalle con el pago y el evento firmados por el admin', async () => {
    const { id } = await e.ctx.servicios.pedidos.crear(solicitud(e));
    const r = await post(`/pedidos/${id}/confirmar-transferencia`);
    expect(r.statusCode).toBe(200);
    const d = PedidoDetalleAdmin.parse(r.json());
    expect(d.estado).toBe('pagado');
    expect(d.pagos).toEqual([
      expect.objectContaining({ medio: 'transferencia', confirmadoPor: 'admin@tienda.test' }),
    ]);
    expect(d.eventos.at(-1)).toMatchObject({
      de: 'pendiente_pago',
      a: 'pagado',
      actor: 'admin@tienda.test',
    });
    expect(d.transicionesPermitidas).toEqual(['listo_para_retirar', 'cancelado']);
  });

  test('transición inválida → 409 con mensaje claro', async () => {
    const { id } = await e.ctx.servicios.pedidos.crear(solicitud(e));
    const r = await post(`/pedidos/${id}/estado`, { a: 'entregado' });
    expect(r.statusCode).toBe(409);
    expect(ErrorRespuesta.parse(r.json()).error).toMatchObject({ codigo: 'TRANSICION_INVALIDA' });
  });

  test('estado desconocido → 400', async () => {
    const { id } = await e.ctx.servicios.pedidos.crear(solicitud(e));
    expect((await post(`/pedidos/${id}/estado`, { a: 'perdido' })).statusCode).toBe(400);
  });

  test('a pagar en el local: antigüedad en días, destacado a las 48 h y contador en el resumen', async () => {
    const { id } = await e.ctx.servicios.pedidos.crear(solicitud(e, { medioPago: 'efectivo' }));
    e.reloj.avanzar(3 * DIA);

    const lista = ListaPedidosAdmin.parse((await get('/pedidos?estado=a_pagar_en_local')).json());
    expect(lista.items.find((p) => p.id === id)).toMatchObject({
      diasEsperando: 3,
      destacado: true,
    });

    const resumen = ResumenAdmin.parse((await get('/resumen')).json());
    expect(resumen.pedidosDestacados).toBe(1);
    expect(resumen.pedidosPorAtender).toBeGreaterThanOrEqual(1);

    const r = await post(`/pedidos/${id}/registrar-efectivo`);
    expect(PedidoDetalleAdmin.parse(r.json())).toMatchObject({
      estado: 'entregado',
      diasEsperando: null,
    });
  });
});

describe('alertas de pago (FR-031)', () => {
  test('se listan, se resuelven con usuario y fecha, y no se resuelven dos veces', async () => {
    const { id, numero } = await e.ctx.servicios.pedidos.crear(
      solicitud(e, { medioPago: 'mercadopago' }),
    );
    const [alerta] = await e.ctx.db
      .insert(alertas)
      .values({
        pedidoId: id,
        tipo: 'monto_distinto',
        detalle: { esperado: 9_000_000, recibido: 100 },
      })
      .returning();

    const abiertas = (await get('/alertas')).json().map((a: unknown) => Alerta.parse(a));
    expect(abiertas).toEqual([
      expect.objectContaining({ id: alerta?.id, numeroPedido: numero, resueltaEn: null }),
    ]);
    expect(ResumenAdmin.parse((await get('/resumen')).json()).alertasAbiertas).toBe(1);

    const detalle = PedidoDetalleAdmin.parse((await get(`/pedidos/${id}`)).json());
    expect(detalle.alertas).toHaveLength(1);

    const r = await post(`/alertas/${alerta?.id}/resolver`);
    expect(r.statusCode).toBe(200);
    expect(Alerta.parse(r.json())).toMatchObject({
      resueltaPor: 'admin@tienda.test',
      resueltaEn: expect.any(String),
    });

    expect((await post(`/alertas/${alerta?.id}/resolver`)).statusCode).toBe(409);
    expect((await get('/alertas')).json()).toEqual([]);
    expect((await get('/alertas?estado=todas')).json()).toHaveLength(1);
  });
});
