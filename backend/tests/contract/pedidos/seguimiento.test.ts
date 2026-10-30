import { Seguimiento } from '@casa/shared';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { construirServidor } from '../../../src/http/server.js';
import { COMPRADOR, prepararCompra, solicitud, type EscenarioCompra } from '../../setup/compra.js';

let e: EscenarioCompra;
let app: FastifyInstance;

beforeAll(async () => {
  e = await prepararCompra();
  app = await construirServidor(e.ctx, { sinLimites: true });
  await app.ready();
});

afterAll(async () => {
  await app.close();
  await e.ctx.cerrar();
});

const rutaDe = (url: string) =>
  new URL(url).pathname.replace('/pedido/', '/api/v1/pedidos/') + new URL(url).search;

describe('seguimiento del pedido', () => {
  test('US2-13: muestra número, productos, entrega, estado y banco; nunca DNI, dirección ni teléfono', async () => {
    const creado = await e.ctx.servicios.pedidos.crear(
      solicitud(e, { entrega: 'colocacion', zonaId: e.zonaMdp }),
    );
    const r = await app.inject({ method: 'GET', url: rutaDe(creado.urlSeguimiento) });
    expect(r.statusCode).toBe(200);
    const s = Seguimiento.parse(r.json());
    expect(s.numero).toBe(creado.numero);
    expect(s.estado).toBe('pendiente_pago');
    expect(s.zona).toBe('Mar del Plata');
    expect(s.banco?.monto).toBe(9_000_000);
    for (const dato of [COMPRADOR.dni, COMPRADOR.calle, COMPRADOR.telefono, COMPRADOR.email]) {
      expect(r.body).not.toContain(dato);
    }
  });

  test('US2-08: vuelta de Mercado Pago con "approved" sin aviso verificado → sigue pendiente, "confirmando"', async () => {
    const creado = await e.ctx.servicios.pedidos.crear(solicitud(e, { medioPago: 'mercadopago' }));
    const r = await app.inject({
      method: 'GET',
      url: `${rutaDe(creado.urlSeguimiento)}&retorno=approved`,
    });
    const s = Seguimiento.parse(r.json());
    expect(s.estado).toBe('pendiente_pago');
    expect(s.pagoEnVerificacion).toBe(true);
    expect(s.puedeReintentarPago).toBe(true);
  });

  test('US2-12: pago rechazado → se puede reintentar con una preferencia nueva', async () => {
    const creado = await e.ctx.servicios.pedidos.crear(solicitud(e, { medioPago: 'mercadopago' }));
    const s = Seguimiento.parse(
      (
        await app.inject({
          method: 'GET',
          url: `${rutaDe(creado.urlSeguimiento)}&retorno=rejected`,
        })
      ).json(),
    );
    expect(s.pagoRechazado).toBe(true);
    const ruta = rutaDe(creado.urlSeguimiento).replace('?t=', '/reintentar-pago?t=');
    const r = await app.inject({ method: 'POST', url: ruta });
    expect(r.statusCode).toBe(200);
    expect(r.json().initPoint).toMatch(/^https:\/\//);
  });

  test('US2-14: con un token incorrecto responde "no encontrado"', async () => {
    const creado = await e.ctx.servicios.pedidos.crear(solicitud(e));
    const r = await app.inject({
      method: 'GET',
      url: `/api/v1/pedidos/${creado.id}?t=token-falso`,
    });
    expect(r.statusCode).toBe(404);
  });
});
