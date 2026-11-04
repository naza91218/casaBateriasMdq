import { afterAll, describe, expect, test } from 'vitest';
import { construirServidor } from '../../../src/http/server.js';
import { crearContextoDePrueba } from '../../setup/contexto.js';

// El monitor de caídas (UptimeRobot, T131) consulta esta ruta cada 5 minutos (US8-03).
const cerrar: (() => Promise<unknown>)[] = [];
afterAll(async () => {
  for (const c of cerrar) await c();
});

async function salud(extra: Record<string, string> = {}) {
  const { ctx } = crearContextoDePrueba(extra);
  const app = await construirServidor(ctx);
  cerrar.push(() => app.close(), () => ctx.cerrar());
  return app.inject({ method: 'GET', url: '/api/v1/salud' });
}

describe('GET /salud', () => {
  test('200 con la base accesible', async () => {
    const r = await salud();
    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual({ estado: 'ok' });
  });

  test('503 sin base, para que el monitor avise', async () => {
    // Un puerto donde no escucha nada: la conexión falla enseguida.
    const r = await salud({ DATABASE_URL: 'postgres://casa:casa@127.0.0.1:1/nada' });
    expect(r.statusCode).toBe(503);
    expect(r.json()).toEqual({ estado: 'sin_base' });
  });
});
