import { ErrorRespuesta } from '@casa/shared';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { z } from 'zod';
import { construirServidor } from '../../../src/http/server.js';
import { ErrorDeDominio } from '../../../src/shared-kernel/errores.js';
import { crearContextoDePrueba } from '../../setup/contexto.js';

// No toca la base: valida solo el formato de errores del contrato.
let app: FastifyInstance;
const reportados: unknown[] = [];

beforeAll(async () => {
  const { ctx } = crearContextoDePrueba();
  app = await construirServidor(ctx, { reportarError: (e) => reportados.push(e) });
  app.get('/prueba/conflicto', async () => {
    throw new ErrorDeDominio('conflicto', 'STOCK_INSUFICIENTE', 'Se agotó mientras comprabas');
  });
  app.post(
    '/prueba/validacion',
    {
      schema: {
        body: z.object({ dni: z.string().regex(/^\d{7,8}$/, 'El DNI tiene solo números, sin puntos') }),
      },
    },
    async () => ({ ok: true }),
  );
  app.get('/prueba/limite', { config: { rateLimit: { max: 1, timeWindow: '1 minute' } } }, async () => ({
    ok: true,
  }));
  app.get('/prueba/explota', async () => {
    throw new Error('falló algo con el dni 30123456');
  });
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe('formato de errores de la API', () => {
  test('error de dominio → código HTTP del tipo y cuerpo del contrato', async () => {
    const r = await app.inject({ method: 'GET', url: '/prueba/conflicto' });
    expect(r.statusCode).toBe(409);
    const cuerpo = ErrorRespuesta.parse(r.json());
    expect(cuerpo.error).toEqual({ codigo: 'STOCK_INSUFICIENTE', mensaje: 'Se agotó mientras comprabas' });
  });

  test('validación → 400 con el mensaje por campo', async () => {
    const r = await app.inject({ method: 'POST', url: '/prueba/validacion', payload: { dni: '30.123.456' } });
    expect(r.statusCode).toBe(400);
    const cuerpo = ErrorRespuesta.parse(r.json());
    expect(cuerpo.error.codigo).toBe('VALIDACION');
    expect(cuerpo.error.campos).toEqual({ dni: 'El DNI tiene solo números, sin puntos' });
  });

  test('ruta inexistente → 404', async () => {
    const r = await app.inject({ method: 'GET', url: '/api/v1/no-existe' });
    expect(r.statusCode).toBe(404);
    expect(ErrorRespuesta.parse(r.json()).error.codigo).toBe('NO_ENCONTRADO');
  });

  test('rate limit → 429 con mensaje claro', async () => {
    await app.inject({ method: 'GET', url: '/prueba/limite' });
    const r = await app.inject({ method: 'GET', url: '/prueba/limite' });
    expect(r.statusCode).toBe(429);
    expect(ErrorRespuesta.parse(r.json()).error.codigo).toBe('LIMITE');
  });

  test('error inesperado → 500 genérico, se reporta y no filtra datos', async () => {
    const r = await app.inject({ method: 'GET', url: '/prueba/explota' });
    expect(r.statusCode).toBe(500);
    expect(r.body).not.toContain('30123456');
    expect(ErrorRespuesta.parse(r.json()).error.codigo).toBe('ERROR_INTERNO');
    expect(reportados).toHaveLength(1);
  });
});
