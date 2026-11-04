import type { FastifyInstance } from 'fastify';
import { desc, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { outboxMensajes } from '../../../src/modules/notificaciones/infrastructure/schema.js';
import { construirServidor } from '../../../src/http/server.js';
import { DIA, MINUTO } from '../../../src/shared-kernel/reloj.js';
import { sembrarBase } from '../../../src/platform/seed/base.js';
import {
  crearContextoDePrueba,
  prepararBase,
  type ContextoDePrueba,
} from '../../setup/contexto.js';

let p: ContextoDePrueba;
let app: FastifyInstance;

beforeAll(async () => {
  await prepararBase();
  p = crearContextoDePrueba();
  await sembrarBase(p.ctx.db, { mailAdmin: 'admin@tienda.test' });
  app = await construirServidor(p.ctx, { sinLimites: true });
  await app.ready();
});

afterAll(async () => {
  await app.close();
  await p.ctx.cerrar();
});

async function pedirEnlace(email: string) {
  return app.inject({ method: 'POST', url: '/api/v1/auth/enlace', payload: { email } });
}

async function ultimoToken(): Promise<string> {
  const filas = await p.ctx.db
    .select()
    .from(outboxMensajes)
    .where(eq(outboxMensajes.evento, 'enlace_ingreso'))
    .orderBy(desc(outboxMensajes.id))
    .limit(1);
  const url = String(filas[0]?.datos.url);
  return new URL(url).searchParams.get('token') ?? '';
}

async function ingresar(): Promise<string> {
  await pedirEnlace('admin@tienda.test');
  const r = await app.inject({
    method: 'GET',
    url: `/api/v1/auth/verificar?token=${await ultimoToken()}`,
  });
  const cookie = r.cookies.find((c) => c.name === 'sesion');
  return cookie?.value ?? '';
}

describe('ingreso al panel con enlace por mail', () => {
  test('US3-02: un mail no autorizado recibe la misma respuesta y no se envía nada', async () => {
    const valido = await pedirEnlace('ADMIN@tienda.test');
    const invalido = await pedirEnlace('otro@tienda.test');
    expect(valido.statusCode).toBe(202);
    expect(invalido.statusCode).toBe(202);
    expect(invalido.body).toBe(valido.body);
    const enlaces = await p.ctx.db
      .select()
      .from(outboxMensajes)
      .where(eq(outboxMensajes.evento, 'enlace_ingreso'));
    expect(enlaces).toHaveLength(1);
    expect(enlaces[0]?.datos.email).toBe('admin@tienda.test');
  });

  test('el enlace crea una sesión de 30 días con cookie segura y redirige al panel', async () => {
    await pedirEnlace('admin@tienda.test');
    const r = await app.inject({
      method: 'GET',
      url: `/api/v1/auth/verificar?token=${await ultimoToken()}`,
    });
    expect(r.statusCode).toBe(302);
    expect(r.headers.location).toBe('http://tienda.test/panel');
    const cookie = r.cookies.find((c) => c.name === 'sesion');
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe('Lax');
    expect(cookie?.maxAge).toBe((30 * DIA) / 1000);
  });

  test('el enlace sirve una sola vez', async () => {
    await pedirEnlace('admin@tienda.test');
    const token = await ultimoToken();
    await app.inject({ method: 'GET', url: `/api/v1/auth/verificar?token=${token}` });
    const segunda = await app.inject({
      method: 'GET',
      url: `/api/v1/auth/verificar?token=${token}`,
    });
    expect(segunda.headers.location).toBe('http://tienda.test/panel/ingresar?error=enlace_vencido');
  });

  test('el enlace vence a los 15 minutos', async () => {
    await pedirEnlace('admin@tienda.test');
    const token = await ultimoToken();
    p.reloj.avanzar(15 * MINUTO + 1000);
    const r = await app.inject({ method: 'GET', url: `/api/v1/auth/verificar?token=${token}` });
    expect(r.headers.location).toBe('http://tienda.test/panel/ingresar?error=enlace_vencido');
  });

  test('US3-01: sin sesión responde 401; con sesión devuelve el usuario', async () => {
    const sin = await app.inject({ method: 'GET', url: '/api/v1/auth/sesion' });
    expect(sin.statusCode).toBe(401);
    const id = await ingresar();
    const con = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/sesion',
      cookies: { sesion: id },
    });
    expect(con.statusCode).toBe(200);
    expect(con.json().usuario.email).toBe('admin@tienda.test');
  });

  test('la sesión vence a los 30 días y se puede cerrar', async () => {
    const id = await ingresar();
    await app.inject({ method: 'POST', url: '/api/v1/auth/salir', cookies: { sesion: id } });
    expect(
      (await app.inject({ method: 'GET', url: '/api/v1/auth/sesion', cookies: { sesion: id } }))
        .statusCode,
    ).toBe(401);

    const otra = await ingresar();
    p.reloj.avanzar(30 * DIA + 1000);
    expect(
      (await app.inject({ method: 'GET', url: '/api/v1/auth/sesion', cookies: { sesion: otra } }))
        .statusCode,
    ).toBe(401);
  });
});
