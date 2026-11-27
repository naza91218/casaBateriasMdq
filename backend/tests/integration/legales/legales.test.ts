import { ErrorRespuesta, PedidoDetalleAdmin } from '@casa/shared';
import { eq, sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { Writable } from 'node:stream';
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { AlmacenamientoMemoria } from '../../../src/adapters/almacenamiento.js';
import { MailerFalso } from '../../../src/adapters/mailer.js';
import { revalidadorNulo } from '../../../src/adapters/revalidador.js';
import { crearContexto } from '../../../src/composition-root.js';
import { construirServidor } from '../../../src/http/server.js';
import { productos } from '../../../src/modules/catalogo/infrastructure/schema.js';
import { arrepentimientos } from '../../../src/modules/legales/infrastructure/schema.js';
import { crearDespachador } from '../../../src/modules/notificaciones/application/despachador.js';
import { outboxMensajes } from '../../../src/modules/notificaciones/infrastructure/schema.js';
import { crearLogger } from '../../../src/platform/logger.js';
import { RelojFalso } from '../../../src/shared-kernel/reloj.js';
import { COMPRADOR, prepararCompra, solicitud, type EscenarioCompra } from '../../setup/compra.js';
import { configDePrueba } from '../../setup/contexto.js';
import { cookieDeAdmin, idDeAdmin } from '../../setup/sesion.js';

let e: EscenarioCompra;
let app: FastifyInstance;
let cookies: { sesion: string };
let admin: string;

beforeAll(async () => {
  e = await prepararCompra();
  await e.ctx.db.update(productos).set({ stock: 100 }).where(eq(productos.id, e.productoId));
  app = await construirServidor(e.ctx, { sinLimites: true });
  await app.ready();
  cookies = await cookieDeAdmin(e.ctx);
  admin = await idDeAdmin(e.ctx);
});

afterAll(async () => {
  await app.close();
  await e.ctx.cerrar();
});

beforeEach(() => {
  e.mailer.enviados.length = 0;
});

const despachar = () =>
  e.ctx.outbox.procesarLote(
    crearDespachador({
      mailer: e.mailer,
      revalidador: revalidadorNulo,
      mailAdmin: 'admin@tienda.test',
    }),
    100,
  );

const arrepentirse = (payload: object) =>
  app.inject({ method: 'POST', url: '/api/v1/arrepentimiento', payload });

const detalle = async (id: string) =>
  PedidoDetalleAdmin.parse(
    (await app.inject({ method: 'GET', url: `/api/v1/admin/pedidos/${id}`, cookies })).json(),
  );

async function pedidoEntregado() {
  const p = await e.ctx.servicios.pedidos.crear(
    solicitud(e, { entrega: 'colocacion', zonaId: e.zonaMdp }),
  );
  await e.ctx.servicios.pagosManuales.confirmarTransferencia(p.id, admin);
  await e.ctx.servicios.panelPedidos.moverEstado(p.id, { a: 'en_camino' }, admin);
  await e.ctx.servicios.panelPedidos.moverEstado(p.id, { a: 'entregado' }, admin);
  return p;
}

describe('botón de arrepentimiento (FR-058)', () => {
  test('US7-02: devuelve un código, avisa al admin, manda la constancia y el pedido muestra la solicitud', async () => {
    const { id, numero } = await e.ctx.servicios.pedidos.crear(solicitud(e));
    const r = await arrepentirse({
      numeroPedido: numero,
      nombre: 'Laura Pérez',
      email: 'LAURA@tienda.test',
    });
    expect(r.statusCode).toBe(201);
    const { codigo } = r.json<{ codigo: string }>();
    expect(codigo).toMatch(/^ARR-[2-9A-HJ-NP-Z]{4}$/);

    expect((await detalle(id)).arrepentimientos).toEqual([
      { codigo, creadoEn: expect.any(String) },
    ]);

    await despachar();
    const aviso = e.mailer.enviados.find(
      (m) => m.para === 'admin@tienda.test' && m.asunto.startsWith('Arrepentimiento'),
    );
    expect(aviso?.asunto).toBe(`Arrepentimiento · pedido #${numero}`);
    expect(aviso?.texto).toContain(codigo);
    expect(aviso?.html).toContain(`http://tienda.test/panel/pedidos/${id}`);
    const constancia = e.mailer.enviados.find(
      (m) => m.para === COMPRADOR.email && m.asunto.includes('arrepentimiento'),
    );
    expect(constancia?.texto).toContain(codigo);
  });

  test('si el mail no es el del pedido, se registra y se avisa al admin, pero no se le escribe a ese mail', async () => {
    const { numero } = await e.ctx.servicios.pedidos.crear(solicitud(e));
    const r = await arrepentirse({
      numeroPedido: numero,
      nombre: 'Otra Persona',
      email: 'otro@ejemplo.test',
    });
    expect(r.statusCode).toBe(201);
    await despachar();
    const deArrepentimiento = e.mailer.enviados.filter((m) => /arrepentimiento/i.test(m.asunto));
    expect(deArrepentimiento.map((m) => m.para)).toEqual(['admin@tienda.test']);
  });

  test('un número que no existe igual se registra, sin pedido, y el aviso lo aclara', async () => {
    const r = await arrepentirse({
      numeroPedido: 999_999,
      nombre: 'Juan Gómez',
      email: 'juan@ejemplo.test',
    });
    expect(r.statusCode).toBe(201);
    const { codigo } = r.json<{ codigo: string }>();
    const [fila] = await e.ctx.db
      .select()
      .from(arrepentimientos)
      .where(eq(arrepentimientos.codigo, codigo));
    expect(fila?.pedidoId).toBeNull();
    await despachar();
    expect(e.mailer.enviados[0]?.texto).toContain('no corresponde a ningún pedido');
    expect(e.mailer.enviados[0]?.html).toContain('http://tienda.test/panel/arrepentimientos');

    const lista = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/arrepentimientos',
      cookies,
    });
    expect(lista.json()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ codigo, numeroPedido: 999_999, pedidoId: null }),
      ]),
    );
  });

  test('datos incompletos → mensajes claros', async () => {
    const r = await arrepentirse({ numeroPedido: 'abc', nombre: 'J', email: 'no-es-mail' });
    expect(r.statusCode).toBe(400);
    expect(ErrorRespuesta.parse(r.json()).error.campos).toMatchObject({
      numeroPedido: 'Escribí el número de pedido',
      nombre: 'Escribí tu nombre',
      email: 'Escribí un mail válido',
    });
  });
});

describe('DNI protegido (FR-059)', () => {
  test('US7-03: en la tabla el DNI no está legible', async () => {
    const { id } = await e.ctx.servicios.pedidos.crear(solicitud(e));
    const filas = await e.ctx.db.execute(
      sql`select * from pedido_compradores where pedido_id = ${id}`,
    );
    expect(filas).toHaveLength(1);
    expect(JSON.stringify(filas)).not.toContain(COMPRADOR.dni);
    // El panel sí lo ve, descifrado.
    expect((await detalle(id)).comprador.dni).toBe(COMPRADOR.dni);
  });

  test('US7-04: un error en el checkout no deja DNI, dirección, teléfono ni mail en los registros ni en Sentry', async () => {
    const lineas: string[] = [];
    const destino = new Writable({
      write(chunk, _enc, cb) {
        lineas.push(String(chunk));
        cb();
      },
    });
    const ctx = crearContexto(configDePrueba(), {
      mailer: new MailerFalso(),
      reloj: new RelojFalso(),
      almacenamiento: new AlmacenamientoMemoria(),
      logger: crearLogger({ nivel: 'info', destino }),
    });
    // Un error como los de PostgreSQL: el mensaje y el detalle pueden traer valores de la fila.
    ctx.servicios.compradores.guardar = async () => {
      throw Object.assign(
        new Error(
          `fallo al guardar el comprador ${COMPRADOR.dni} (${COMPRADOR.email}, 2235123456)`,
        ),
        {
          detail: `Failing row contains (${COMPRADOR.nombre}, ${COMPRADOR.dni}, ${COMPRADOR.calle} ${COMPRADOR.numero})`,
          parameters: [COMPRADOR.nombre, COMPRADOR.dni, COMPRADOR.calle],
        },
      );
    };
    const reportados: unknown[] = [];
    const servidor = await construirServidor(ctx, {
      sinLimites: true,
      reportarError: (err) => reportados.push(err),
    });
    try {
      const r = await servidor.inject({
        method: 'POST',
        url: '/api/v1/pedidos',
        payload: solicitud(e, { entrega: 'colocacion', zonaId: e.zonaMdp }),
      });
      expect(r.statusCode).toBe(500);
      expect(ErrorRespuesta.parse(r.json()).error.codigo).toBe('ERROR_INTERNO');

      expect(lineas.join('')).toContain('error no controlado');
      expect(reportados).toHaveLength(1);
      const reportado = reportados[0] as Error;
      const todo = [
        r.body,
        ...lineas,
        reportado.message,
        reportado.stack,
        JSON.stringify(reportado),
      ].join('\n');
      for (const dato of [
        COMPRADOR.dni,
        COMPRADOR.email,
        COMPRADOR.calle,
        COMPRADOR.nombre,
        '2235123456',
        '512 3456',
      ]) {
        expect(todo).not.toContain(dato);
      }
    } finally {
      await servidor.close();
      await ctx.cerrar();
    }
  });
});

describe('anonimizar (FR-061)', () => {
  test('US7-06: borra los datos personales y conserva total, productos y fecha', async () => {
    const { id, numero } = await pedidoEntregado();
    await arrepentirse({ numeroPedido: numero, nombre: COMPRADOR.nombre, email: COMPRADOR.email });
    const antes = await detalle(id);
    expect(antes.puedeAnonimizar).toBe(true);

    const r = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/pedidos/${id}/anonimizar`,
      cookies,
      payload: {},
    });
    expect(r.statusCode).toBe(200);
    const despues = PedidoDetalleAdmin.parse(r.json());

    expect(despues.comprador).toEqual({
      nombre: 'Anónimo',
      dni: '',
      telefono: '',
      email: '',
      calle: null,
      numero: null,
      referencias: null,
      anonimizado: true,
    });
    expect(despues.puedeAnonimizar).toBe(false);
    expect(despues.mapaUrl).toBeNull();
    expect(despues.whatsapp).toBeNull();
    for (const campo of [
      'numero',
      'estado',
      'items',
      'subtotal',
      'descuento',
      'costoZona',
      'total',
      'creadoEn',
      'pagos',
      'eventos',
    ] as const) {
      expect(despues[campo]).toEqual(antes[campo]);
    }
    // La solicitud de arrepentimiento queda, sin nombre ni mail.
    expect(despues.arrepentimientos).toEqual(antes.arrepentimientos);
    const [solicitudGuardada] = await e.ctx.db
      .select()
      .from(arrepentimientos)
      .where(eq(arrepentimientos.pedidoId, id));
    expect(solicitudGuardada).toMatchObject({ nombre: 'Anónimo', email: '' });
    // Los mails guardados del pedido (con nombre y mail) se borran.
    expect(
      await e.ctx.db.select().from(outboxMensajes).where(eq(outboxMensajes.pedidoId, id)),
    ).toHaveLength(0);
    const filas = await e.ctx.db.execute(
      sql`select * from pedido_compradores where pedido_id = ${id}`,
    );
    expect(JSON.stringify(filas)).not.toMatch(/Laura|Colón|laura@|512 3456/);
  });

  test('un pedido en curso no se anonimiza, y uno ya anonimizado tampoco dos veces', async () => {
    const enCurso = await e.ctx.servicios.pedidos.crear(solicitud(e));
    const r1 = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/pedidos/${enCurso.id}/anonimizar`,
      cookies,
      payload: {},
    });
    expect(r1.statusCode).toBe(409);
    expect(ErrorRespuesta.parse(r1.json()).error.mensaje).toBe(
      'Solo se pueden anonimizar pedidos entregados o cancelados',
    );
    expect((await detalle(enCurso.id)).puedeAnonimizar).toBe(false);

    const { id } = await pedidoEntregado();
    await e.ctx.servicios.anonimizacion.anonimizar(id);
    const r2 = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/pedidos/${id}/anonimizar`,
      cookies,
      payload: {},
    });
    expect(r2.statusCode).toBe(409);
    expect(ErrorRespuesta.parse(r2.json()).error.codigo).toBe('YA_ANONIMIZADO');
  });

  test('sin sesión → 401', async () => {
    const r = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/pedidos/0190a0a0-0000-7000-8000-000000000000/anonimizar',
      payload: {},
    });
    expect(r.statusCode).toBe(401);
  });
});
