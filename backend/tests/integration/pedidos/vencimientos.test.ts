import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { outboxMensajes } from '../../../src/modules/notificaciones/infrastructure/schema.js';
import { pedidos } from '../../../src/modules/pedidos/infrastructure/schema.js';
import { DIA, HORA, MINUTO } from '../../../src/shared-kernel/reloj.js';
import { prepararCompra, solicitud, stockDe, type EscenarioCompra } from '../../setup/compra.js';
import { idDeAdmin } from '../../setup/sesion.js';

let e: EscenarioCompra;

beforeAll(async () => {
  e = await prepararCompra();
});

afterAll(async () => {
  await e.ctx.cerrar();
});

async function estado(id: string) {
  const [p] = await e.ctx.db
    .select({ estado: pedidos.estado })
    .from(pedidos)
    .where(eq(pedidos.id, id));
  return p?.estado;
}

describe('vencimientos (FR-034, clarify)', () => {
  test('Mercado Pago: a los 29 min sigue pendiente; a los 31 min se cancela y vuelve el stock', async () => {
    const antes = await stockDe(e, e.productoId);
    const { id } = await e.ctx.servicios.pedidos.crear(solicitud(e, { medioPago: 'mercadopago' }));
    expect(await stockDe(e, e.productoId)).toBe(antes - 1);

    e.reloj.avanzar(29 * MINUTO);
    await e.ctx.servicios.vencimientos.cancelarVencidos();
    expect(await estado(id)).toBe('pendiente_pago');

    e.reloj.avanzar(2 * MINUTO);
    expect(await e.ctx.servicios.vencimientos.cancelarVencidos()).toBe(1);
    expect(await estado(id)).toBe('cancelado');
    expect(await stockDe(e, e.productoId)).toBe(antes);
    const mails = await e.ctx.db
      .select()
      .from(outboxMensajes)
      .where(eq(outboxMensajes.pedidoId, id));
    expect(mails.map((m) => m.evento)).toContain('cancelado');
  });

  test('US2-16: transferencia a las 47 h sigue; a las 49 h se cancela', async () => {
    const { id } = await e.ctx.servicios.pedidos.crear(solicitud(e));
    e.reloj.avanzar(47 * HORA);
    await e.ctx.servicios.vencimientos.cancelarVencidos();
    expect(await estado(id)).toBe('pendiente_pago');
    e.reloj.avanzar(2 * HORA);
    await e.ctx.servicios.vencimientos.cancelarVencidos();
    expect(await estado(id)).toBe('cancelado');
  });

  test('efectivo en el local: a los 7 días sin retirarla se cancela y el stock vuelve (clarify 2026-11-02)', async () => {
    const antes = await stockDe(e, e.productoId);
    const { id } = await e.ctx.servicios.pedidos.crear(solicitud(e, { medioPago: 'efectivo' }));
    expect(await stockDe(e, e.productoId)).toBe(antes - 1);

    e.reloj.avanzar(7 * DIA - HORA);
    await e.ctx.servicios.vencimientos.cancelarVencidos();
    expect(await estado(id)).toBe('a_pagar_en_local');

    e.reloj.avanzar(2 * HORA);
    await e.ctx.servicios.vencimientos.cancelarVencidos();
    expect(await estado(id)).toBe('cancelado');
    expect(await stockDe(e, e.productoId)).toBe(antes);
  });

  test('efectivo retirado y cobrado antes del plazo ya no se cancela', async () => {
    const { id } = await e.ctx.servicios.pedidos.crear(solicitud(e, { medioPago: 'efectivo' }));
    await e.ctx.servicios.pagosManuales.registrarEfectivo(id, await idDeAdmin(e.ctx));
    e.reloj.avanzar(8 * DIA);
    await e.ctx.servicios.vencimientos.cancelarVencidos();
    expect(await estado(id)).toBe('entregado');
  });

  test('US2-17: cancelar dos veces devuelve el stock una sola vez', async () => {
    const antes = await stockDe(e, e.productoId);
    const { id } = await e.ctx.servicios.pedidos.crear(solicitud(e));
    await e.ctx.servicios.estados.cambiar({ pedidoId: id, a: 'cancelado', actor: 'sistema' });
    await expect(
      e.ctx.servicios.estados.cambiar({ pedidoId: id, a: 'cancelado', actor: 'sistema' }),
    ).rejects.toMatchObject({
      codigo: 'TRANSICION_INVALIDA',
    });
    expect(await stockDe(e, e.productoId)).toBe(antes);
  });
});
