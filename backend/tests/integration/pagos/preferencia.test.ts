import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from 'vitest';
import { PasarelaMercadoPago } from '../../../src/adapters/mercadopago.js';
import { MINUTO } from '../../../src/shared-kernel/reloj.js';
import { prepararCompra, solicitud, type EscenarioCompra } from '../../setup/compra.js';

let e: EscenarioCompra;

beforeAll(async () => {
  e = await prepararCompra();
});

afterAll(async () => {
  await e.ctx.cerrar();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('preferencia de Mercado Pago (FR-034b)', () => {
  test('el pedido crea una preferencia que vence junto con la reserva (30 min)', async () => {
    const creado = await e.ctx.servicios.pedidos.crear(solicitud(e, { medioPago: 'mercadopago' }));
    const pref = e.pasarela.preferencias.at(-1);
    expect(pref?.pedidoId).toBe(creado.id);
    expect(pref?.venceEn.getTime()).toBe(e.reloj.ahora().getTime() + 30 * MINUTO);
    expect(pref?.urlNotificacion).toBe('http://api.test/api/v1/webhooks/mercadopago');
    expect(creado.pago).toEqual({ tipo: 'mercadopago', initPoint: expect.stringMatching(/^https:/) });
  });

  test('si Mercado Pago falla, el pedido igual se crea y se puede reintentar', async () => {
    e.pasarela.falla = true;
    const creado = await e.ctx.servicios.pedidos.crear(solicitud(e, { medioPago: 'mercadopago' }));
    e.pasarela.falla = false;
    expect(creado.pago).toEqual({ tipo: 'mercadopago', initPoint: null });
  });

  test('el adaptador real pide solo medios instantáneos, con vencimiento y referencia externa', async () => {
    const fetchFalso = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ id: 'p1', init_point: 'https://mp/checkout' }), { status: 201 }));
    const pasarela = new PasarelaMercadoPago('TEST-token', 'secreto');
    const venceEn = new Date('2026-11-01T12:30:00Z');
    await pasarela.crearPreferencia({
      pedidoId: 'pedido-1',
      items: [{ titulo: 'Sermat 12x65', cantidad: 1, precioUnitarioCentavos: 10_000_000n }],
      emailComprador: 'laura@tienda.test',
      urlRetorno: 'http://tienda.test/pedido/1?t=x',
      urlNotificacion: 'http://api.test/api/v1/webhooks/mercadopago',
      venceEn,
    });
    const cuerpo = JSON.parse(String(fetchFalso.mock.calls[0]?.[1]?.body));
    expect(cuerpo.external_reference).toBe('pedido-1');
    expect(cuerpo.expires).toBe(true);
    expect(cuerpo.expiration_date_to).toBe(venceEn.toISOString());
    expect(cuerpo.payment_methods.excluded_payment_types).toEqual([{ id: 'ticket' }, { id: 'atm' }]);
    expect(cuerpo.items[0].unit_price).toBe(100_000);
  });
});
