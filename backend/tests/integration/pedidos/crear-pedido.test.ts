import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { pedidoCompradores } from '../../../src/modules/clientes/infrastructure/schema.js';
import { zonasColocacion } from '../../../src/modules/entregas/infrastructure/schema.js';
import { outboxMensajes } from '../../../src/modules/notificaciones/infrastructure/schema.js';
import { pedidos } from '../../../src/modules/pedidos/infrastructure/schema.js';
import { construirServidor } from '../../../src/http/server.js';
import { DIA } from '../../../src/shared-kernel/reloj.js';
import { crearContextoDePrueba } from '../../setup/contexto.js';
import { crearProducto } from '../../setup/fixtures.js';
import {
  COMPRADOR,
  prepararCompra,
  solicitud,
  stockDe,
  type EscenarioCompra,
} from '../../setup/compra.js';

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

const post = (url: string, payload: unknown) =>
  app.inject({ method: 'POST', url: `/api/v1${url}`, payload: payload as object });

describe('crear pedido como invitado (US2)', () => {
  test('US2-01: colocación sin dirección → "Falta la dirección para ir a colocarla"', async () => {
    const s = solicitud(e, {
      entrega: 'colocacion',
      zonaId: e.zonaMdp,
      comprador: { ...COMPRADOR, calle: undefined, numero: undefined },
    });
    const r = await post('/pedidos', s);
    expect(r.statusCode).toBe(400);
    expect(r.json().error.campos['comprador.calle']).toBe('Falta la dirección para ir a colocarla');
  });

  test('US2-02: DNI con letras o puntos → "El DNI tiene solo números, sin puntos"', async () => {
    const r = await post(
      '/pedidos',
      solicitud(e, { comprador: { ...COMPRADOR, dni: '30.123.456' } }),
    );
    expect(r.statusCode).toBe(400);
    expect(r.json().error.campos['comprador.dni']).toBe('El DNI tiene solo números, sin puntos');
  });

  test('US2-03: dos compras simultáneas de la última unidad → una sola pasa y el stock queda en 0', async () => {
    const ultima = await crearProducto(e.ctx.db, {
      marca: 'Herbo',
      medida: '12x65',
      gama: 'reforzada',
      stock: 1,
    });
    const intento = () =>
      e.ctx.servicios.pedidos.crear(
        solicitud(e, { items: [{ productoId: ultima.id, cantidad: 1 }] }),
      );
    const resultados = await Promise.allSettled([intento(), intento()]);
    const ok = resultados.filter((r) => r.status === 'fulfilled');
    const fallidos = resultados.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    expect(ok).toHaveLength(1);
    expect(fallidos).toHaveLength(1);
    expect(String(fallidos[0]?.reason.mensaje)).toContain('Se agotó mientras comprabas');
    expect(await stockDe(e, ultima.id)).toBe(0);
  });

  test('US2-04: un precio o total enviado por el navegador se ignora', async () => {
    const payload = {
      ...solicitud(e, { medioPago: 'mercadopago' }),
      total: 1,
      items: [{ productoId: e.productoId, cantidad: 1, precioUnitario: 1 }],
    };
    const r = await post('/pedidos', payload);
    expect(r.statusCode).toBe(201);
    expect(r.json().total).toBe(10_000_000);
  });

  test('US2-05: con colocación no se ofrece ni se acepta efectivo', async () => {
    const cot = await post('/checkout/cotizar', {
      items: [{ productoId: e.productoId, cantidad: 1 }],
      entrega: 'colocacion',
      zonaId: e.zonaMdp,
      medioPago: 'mercadopago',
    });
    expect(cot.json().mediosDisponibles).toEqual(['mercadopago', 'transferencia']);
    const r = await post(
      '/pedidos',
      solicitud(e, { entrega: 'colocacion', zonaId: e.zonaMdp, medioPago: 'efectivo' }),
    );
    expect(r.statusCode).toBe(422);
  });

  test('US2-06: transferencia → $90.000, datos bancarios y vence a las 48 h', async () => {
    const r = await post('/pedidos', solicitud(e));
    expect(r.statusCode).toBe(201);
    const creado = r.json();
    expect(creado.total).toBe(9_000_000);
    expect(creado.pago.tipo).toBe('transferencia');
    expect(creado.pago.banco.monto).toBe(9_000_000);
    expect(new Date(creado.pago.banco.venceEn).getTime() - e.reloj.ahora().getTime()).toBe(
      48 * 3600 * 1000,
    );
    expect(creado.numero).toBeGreaterThanOrEqual(1001);
  });

  test('US2-15: zona con costo extra se suma desglosada', async () => {
    const [batan] = await e.ctx.db
      .insert(zonasColocacion)
      .values({ nombre: 'Batán', costoExtra: 500_000n })
      .returning();
    const cot = await post('/checkout/cotizar', {
      items: [{ productoId: e.productoId, cantidad: 1 }],
      entrega: 'colocacion',
      zonaId: batan?.id,
      medioPago: 'mercadopago',
    });
    expect(cot.json().costoZona).toBe(500_000);
    expect(cot.json().total).toBe(10_500_000);
  });

  test('el DNI se guarda cifrado y no viaja en los mails; se encolan mail al comprador y aviso al admin', async () => {
    const r = await post('/pedidos', solicitud(e));
    const id = r.json().id as string;
    const [c] = await e.ctx.db
      .select()
      .from(pedidoCompradores)
      .where(eq(pedidoCompradores.pedidoId, id));
    expect(c?.dniCifrado.toString('utf8')).not.toContain(COMPRADOR.dni);
    const mails = await e.ctx.db
      .select()
      .from(outboxMensajes)
      .where(eq(outboxMensajes.pedidoId, id));
    expect(mails.map((m) => m.evento).sort()).toEqual([
      'aviso_admin_pedido_nuevo',
      'pedido_recibido',
    ]);
    expect(JSON.stringify(mails)).not.toContain(COMPRADOR.dni);
    const [p] = await e.ctx.db.select().from(pedidos).where(eq(pedidos.id, id));
    expect(p?.estado).toBe('pendiente_pago');
  });

  test('efectivo con retiro queda "a pagar en el local" y vence a los 7 días', async () => {
    const r = await post('/pedidos', solicitud(e, { medioPago: 'efectivo' }));
    expect(r.statusCode).toBe(201);
    const [p] = await e.ctx.db.select().from(pedidos).where(eq(pedidos.id, r.json().id));
    expect(p?.estado).toBe('a_pagar_en_local');
    expect(p?.venceEn?.getTime()).toBe(e.reloj.ahora().getTime() + 7 * DIA);
    expect(Number(p?.total)).toBe(9_000_000);
  });
});

describe('nadie puede dejar el local sin stock con pedidos que no paga (auditoría)', () => {
  test('hasta 10 baterías por pedido y sin repetir el producto en dos líneas', async () => {
    const otro = await crearProducto(e.ctx.db, {
      marca: 'Herbo',
      medida: '12x65',
      gama: 'reforzada',
      stock: 50,
    });
    const repetido = await post(
      '/pedidos',
      solicitud(e, {
        items: [
          { productoId: e.productoId, cantidad: 1 },
          { productoId: e.productoId, cantidad: 1 },
        ],
      }),
    );
    expect(repetido.statusCode).toBe(400);
    expect(repetido.json().error.campos.items).toBe(
      'El mismo producto está dos veces en el carrito',
    );

    const muchas = await post('/checkout/cotizar', {
      items: [
        { productoId: e.productoId, cantidad: 5 },
        { productoId: otro.id, cantidad: 6 },
      ],
      entrega: 'retiro',
      medioPago: 'transferencia',
    });
    expect(muchas.statusCode).toBe(400);
    expect(muchas.json().error.campos.items).toBe(
      'Para más de 10 baterías, escribinos por WhatsApp',
    );
  });

  test('un mismo comprador puede tener hasta 3 pedidos sin pagar, por mail o por teléfono', async () => {
    // Con el tope real (los demás tests lo suben porque reusan a la misma compradora).
    const p = crearContextoDePrueba({ MAX_PEDIDOS_SIN_PAGAR: '3' });
    try {
      const producto = await crearProducto(e.ctx.db, {
        marca: 'Sermat',
        medida: '12x70',
        gama: 'reforzada',
        stock: 50,
      });
      const comprador = { ...COMPRADOR, email: 'acaparador@tienda.test', telefono: '223 400 9999' };
      const pedir = (cambios: Partial<typeof comprador>) =>
        p.ctx.servicios.pedidos.crear(
          solicitud(e, {
            items: [{ productoId: producto.id, cantidad: 1 }],
            comprador: { ...comprador, ...cambios },
          }),
        );

      const primero = await pedir({});
      await pedir({});
      await pedir({ email: 'otro-mail@tienda.test' }); // mismo teléfono
      // El cuarto, con otro mail y el teléfono escrito distinto: es la misma persona.
      await expect(
        pedir({ email: 'tercero@tienda.test', telefono: '0223 15-400-9999' }),
      ).rejects.toMatchObject({
        codigo: 'PEDIDOS_SIN_PAGAR',
        mensaje: expect.stringContaining('Ya tenés 3 pedidos sin pagar'),
      });

      // Cuando uno se cancela (o se paga), puede volver a comprar.
      await p.ctx.servicios.estados.cambiar({
        pedidoId: primero.id,
        a: 'cancelado',
        actor: 'worker',
        motivo: 'vencido',
      });
      await expect(pedir({})).resolves.toMatchObject({ numero: expect.any(Number) });
    } finally {
      await p.ctx.cerrar();
    }
  });
});
