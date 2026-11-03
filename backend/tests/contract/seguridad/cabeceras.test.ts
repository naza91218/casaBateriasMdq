import { ErrorRespuesta } from '@casa/shared';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { sembrarBase } from '../../../db/seed/base.js';
import { construirServidor } from '../../../src/http/server.js';
import {
  crearContextoDePrueba,
  prepararBase,
  type ContextoDePrueba,
} from '../../setup/contexto.js';
import { cookieDeAdmin } from '../../setup/sesion.js';

let p: ContextoDePrueba;
let app: FastifyInstance;
let cookies: { sesion: string };

beforeAll(async () => {
  await prepararBase();
  p = crearContextoDePrueba();
  await sembrarBase(p.ctx.db, { mailAdmin: 'admin@tienda.test' });
  // Con los límites activos, como en producción.
  app = await construirServidor(p.ctx);
  await app.ready();
  cookies = await cookieDeAdmin(p.ctx);
});

afterAll(async () => {
  await app.close();
  await p.ctx.cerrar();
});

describe('cabeceras de seguridad (T146)', () => {
  test('toda respuesta lleva las cabeceras de helmet', async () => {
    const r = await app.inject({ method: 'GET', url: '/api/v1/configuracion/publica' });
    expect(r.statusCode).toBe(200);
    expect(r.headers).toMatchObject({
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'DENY',
      'referrer-policy': 'no-referrer',
      'strict-transport-security': 'max-age=15552000',
    });
    expect(r.headers['x-powered-by']).toBeUndefined();
  });
});

describe('acciones del panel desde otro sitio (CSRF)', () => {
  const resolver = (headers: Record<string, string>) =>
    app.inject({
      method: 'POST',
      url: '/api/v1/admin/alertas/0190a0a0-0000-7000-8000-000000000000/resolver',
      cookies,
      headers,
      payload: {},
    });

  test('con Origin de otro sitio o Sec-Fetch-Site cross-site → 403, aunque haya sesión', async () => {
    const desdeOtroSitio: Record<string, string>[] = [
      { origin: 'https://sitio-malicioso.example' },
      { 'sec-fetch-site': 'cross-site' },
    ];
    for (const headers of desdeOtroSitio) {
      const r = await resolver(headers);
      expect(r.statusCode).toBe(403);
      expect(ErrorRespuesta.parse(r.json()).error.codigo).toBe('ORIGEN_NO_PERMITIDO');
    }
  });

  test('desde la tienda o sin Origin pasa el control (y responde según la alerta)', async () => {
    const permitidos: Record<string, string>[] = [{ origin: 'http://tienda.test' }, {}];
    for (const headers of permitidos) {
      expect((await resolver(headers)).statusCode).toBe(404);
    }
  });

  test('las lecturas no se controlan', async () => {
    const r = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/resumen',
      cookies,
      headers: { origin: 'https://sitio-malicioso.example' },
    });
    expect(r.statusCode).toBe(200);
  });
});

describe('IP real para los límites de intentos', () => {
  test('desde internet, X-Forwarded-For inventado no esquiva el límite', async () => {
    const codigos: number[] = [];
    for (let i = 0; i < 6; i++) {
      const r = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/enlace',
        remoteAddress: '203.0.113.7',
        headers: { 'x-forwarded-for': `198.51.100.${i}` },
        payload: { email: 'alguien@tienda.test' },
      });
      codigos.push(r.statusCode);
    }
    expect(codigos).toEqual([202, 202, 202, 202, 202, 429]);
  });

  test('detrás de Nginx (red interna), cuenta la IP que informa el proxy', async () => {
    const codigos: number[] = [];
    for (let i = 0; i < 6; i++) {
      const r = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/enlace',
        remoteAddress: '172.18.0.5',
        headers: { 'x-forwarded-for': `198.51.100.${i}` },
        payload: { email: 'alguien@tienda.test' },
      });
      codigos.push(r.statusCode);
    }
    expect(codigos.every((c) => c === 202)).toBe(true);
  });
});
