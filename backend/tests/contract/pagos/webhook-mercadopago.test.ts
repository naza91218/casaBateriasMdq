import { and, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { outboxMensajes } from '../../../src/modules/notificaciones/infrastructure/schema.js';
import { alertas, pagos } from '../../../src/modules/pagos/infrastructure/schema.js';
import { pedidos } from '../../../src/modules/pedidos/infrastructure/schema.js';
import { construirServidor } from '../../../src/http/server.js';
import { prepararCompra, solicitud, type EscenarioCompra } from '../../setup/compra.js';

let e: EscenarioCompra;
let app: FastifyInstance;
let contador = 0;

beforeAll(async () => {
  e = await prepararCompra();
  app = await construirServidor(e.ctx, { sinLimites: true });
  await app.ready();
});

afterAll(async () => {
  await app.close();
  await e.ctx.cerrar();
});

async function pedidoMp() {
  return e.ctx.servicios.pedidos.crear(solicitud(e, { medioPago: 'mercadopago' }));
}

function notificar(idPago: string, firmaValida = true) {
  const requestId = `req-${++contador}`;
  return app.inject({
    method: 'POST',
    url: `/api/v1/webhooks/mercadopago?data.id=${idPago}&type=payment`,
    headers: {
      'x-request-id': requestId,
      'x-signature': firmaValida ? e.pasarela.firmar(idPago, requestId) : 'ts=1,v1=deadbeef',
    },
    payload: { type: 'payment', data: { id: idPago } },
  });
}

async function estado(id: string) {
  const [p] = await e.ctx.db
    .select({ estado: pedidos.estado })
    .from(pedidos)
    .where(eq(pedidos.id, id));
  return p?.estado;
}

describe('webhook de Mercado Pago', () => {
  test('US2-07: pago aprobado consultado a la API → pagado y pago registrado', async () => {
    const { id, total } = await pedidoMp();
    e.pasarela.registrarPago('1001', id, 'approved', BigInt(total));
    const r = await notificar('1001');
    expect(r.statusCode).toBe(200);
    expect(r.json().resultado).toBe('pagado');
    expect(await estado(id)).toBe('pagado');
    expect(await e.ctx.db.select().from(pagos).where(eq(pagos.pedidoId, id))).toHaveLength(1);
  });

  test('US2-09: el mismo aviso tres veces cambia el pedido una vez y encola un solo mail', async () => {
    const { id, total } = await pedidoMp();
    e.pasarela.registrarPago('1002', id, 'approved', BigInt(total));
    const resultados = [];
    for (let i = 0; i < 3; i++) resultados.push((await notificar('1002')).json().resultado);
    expect(resultados).toEqual(['pagado', 'repetida', 'repetida']);
    const mails = await e.ctx.db
      .select()
      .from(outboxMensajes)
      .where(and(eq(outboxMensajes.pedidoId, id), eq(outboxMensajes.evento, 'pago_confirmado')));
    expect(mails).toHaveLength(1);
  });

  test('US2-10: firma inválida → 401 y no cambia nada', async () => {
    const { id, total } = await pedidoMp();
    e.pasarela.registrarPago('1003', id, 'approved', BigInt(total));
    const r = await notificar('1003', false);
    expect(r.statusCode).toBe(401);
    expect(await estado(id)).toBe('pendiente_pago');
  });

  test('US2-11: monto menor al total → no se paga y queda una alerta para el admin', async () => {
    const { id, total } = await pedidoMp();
    e.pasarela.registrarPago('1004', id, 'approved', BigInt(total - 100));
    expect((await notificar('1004')).json().resultado).toBe('alerta_monto_distinto');
    expect(await estado(id)).toBe('pendiente_pago');
    const [alerta] = await e.ctx.db.select().from(alertas).where(eq(alertas.pedidoId, id));
    expect(alerta?.tipo).toBe('monto_distinto');
  });

  test('pago aprobado sobre un pedido cancelado → no se reactiva y queda alerta', async () => {
    const { id, total } = await pedidoMp();
    await e.ctx.servicios.estados.cambiar({
      pedidoId: id,
      a: 'cancelado',
      actor: 'worker',
      motivo: 'vencido',
    });
    e.pasarela.registrarPago('1005', id, 'approved', BigInt(total));
    expect((await notificar('1005')).json().resultado).toBe('alerta_pago_sobre_cancelado');
    expect(await estado(id)).toBe('cancelado');
  });

  test('US2-12: pago rechazado → sigue pendiente y se registra el intento', async () => {
    const { id, total } = await pedidoMp();
    e.pasarela.registrarPago('1006', id, 'rejected', BigInt(total));
    expect((await notificar('1006')).json().resultado).toBe('registrado');
    expect(await estado(id)).toBe('pendiente_pago');
    const [pago] = await e.ctx.db.select().from(pagos).where(eq(pagos.idExterno, '1006'));
    expect(pago?.estado).toBe('rejected');
  });

  test('si Mercado Pago no responde → 500 para que reintente', async () => {
    e.pasarela.falla = true;
    const r = await notificar('1007');
    e.pasarela.falla = false;
    expect(r.statusCode).toBe(500);
  });
});
