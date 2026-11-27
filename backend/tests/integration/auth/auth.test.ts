import type { FastifyInstance } from 'fastify';
import { desc, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { usuariosPanel } from '../../../src/modules/auth/infrastructure/schema.js';
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

describe('ingreso con mail y contraseña', () => {
  const entrar = (email: string, clave: string) =>
    app.inject({ method: 'POST', url: '/api/v1/auth/ingresar', payload: { email, clave } });
  const cambiar = (sesion: string, payload: { actual?: string; nueva: string }) =>
    app.inject({ method: 'POST', url: '/api/v1/auth/clave', cookies: { sesion }, payload });
  const sesionDe = (sesion: string) =>
    app.inject({ method: 'GET', url: '/api/v1/auth/sesion', cookies: { sesion } });

  test('sin contraseña puesta no se entra; la primera vez se pone desde el enlace', async () => {
    expect((await entrar('admin@tienda.test', 'cualquiera-123')).statusCode).toBe(401);
    const id = await ingresar();
    expect((await sesionDe(id)).json().usuario.tieneClave).toBe(false);

    const corta = await cambiar(id, { nueva: 'corta' });
    expect(corta.statusCode).toBe(400);
    expect((await cambiar(id, { nueva: 'una-clave-larga-1' })).statusCode).toBe(204);
    expect((await sesionDe(id)).json().usuario.tieneClave).toBe(true);
  });

  test('con la contraseña correcta entra con sesión de 30 días; con otra, el mismo error', async () => {
    const ok = await entrar('ADMIN@tienda.test', 'una-clave-larga-1');
    expect(ok.statusCode).toBe(204);
    const cookie = ok.cookies.find((c) => c.name === 'sesion');
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.maxAge).toBe((30 * DIA) / 1000);
    expect((await sesionDe(cookie?.value ?? '')).statusCode).toBe(200);

    const mala = await entrar('admin@tienda.test', 'otra-clave-123');
    const noExiste = await entrar('nadie@tienda.test', 'una-clave-larga-1');
    expect(mala.statusCode).toBe(401);
    expect(noExiste.statusCode).toBe(401);
    expect(mala.json().error.mensaje).toBe(noExiste.json().error.mensaje);
  });

  test('cambiarla pide la actual y cierra las demás sesiones', async () => {
    const a = (await entrar('admin@tienda.test', 'una-clave-larga-1')).cookies[0]?.value ?? '';
    const b = (await entrar('admin@tienda.test', 'una-clave-larga-1')).cookies[0]?.value ?? '';

    expect((await cambiar(a, { nueva: 'nueva-clave-larga-2' })).statusCode).toBe(400);
    expect(
      (await cambiar(a, { actual: 'mal-12345678', nueva: 'nueva-clave-larga-2' })).statusCode,
    ).toBe(400);
    expect(
      (await cambiar(a, { actual: 'una-clave-larga-1', nueva: 'nueva-clave-larga-2' })).statusCode,
    ).toBe(204);

    expect((await sesionDe(a)).statusCode).toBe(200);
    expect((await sesionDe(b)).statusCode).toBe(401);
    expect((await entrar('admin@tienda.test', 'una-clave-larga-1')).statusCode).toBe(401);
    expect((await entrar('admin@tienda.test', 'nueva-clave-larga-2')).statusCode).toBe(204);
  });

  test('sin sesión no se puede cambiar, y desde otro sitio tampoco', async () => {
    expect((await cambiar('', { nueva: 'x-clave-larga-3' })).statusCode).toBe(401);
    const id = (await entrar('admin@tienda.test', 'nueva-clave-larga-2')).cookies[0]?.value ?? '';
    const r = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/clave',
      cookies: { sesion: id },
      headers: { origin: 'https://otro-sitio.test' },
      payload: { actual: 'nueva-clave-larga-2', nueva: 'x-clave-larga-3' },
    });
    expect(r.statusCode).toBe(403);
  });

  test('la contraseña se guarda con hash, nunca en claro', async () => {
    const [u] = await p.ctx.db.select().from(usuariosPanel);
    expect(u?.claveHash).toMatch(/^scrypt\$/);
    expect(u?.claveHash).not.toContain('nueva-clave-larga-2');
  });
});

describe('ingreso directo de la demo (DEMO_INGRESO_DIRECTO)', () => {
  test('sin la variable, la ruta no existe', async () => {
    const r = await app.inject({ method: 'GET', url: '/api/v1/auth/demo' });
    expect(r.statusCode).toBe(404);
  });

  test('con la variable, entra al panel sin mail', async () => {
    const demo = crearContextoDePrueba({ DEMO_INGRESO_DIRECTO: 'admin@tienda.test' });
    const appDemo = await construirServidor(demo.ctx, { sinLimites: true });
    try {
      const r = await appDemo.inject({ method: 'GET', url: '/api/v1/auth/demo' });
      expect(r.statusCode).toBe(302);
      expect(r.headers.location).toMatch(/\/panel$/);
      const id = r.cookies.find((c) => c.name === 'sesion')?.value ?? '';
      const sesion = await appDemo.inject({
        method: 'GET',
        url: '/api/v1/auth/sesion',
        cookies: { sesion: id },
      });
      expect(sesion.json().usuario.email).toBe('admin@tienda.test');
    } finally {
      await appDemo.close();
      await demo.ctx.cerrar();
    }
  });
});
