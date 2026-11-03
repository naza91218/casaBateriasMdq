import { Writable } from 'node:stream';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { AlmacenamientoMemoria } from '../../../src/adapters/almacenamiento.js';
import { MailerFalso } from '../../../src/adapters/mailer.js';
import { crearContexto, type Contexto } from '../../../src/composition-root.js';
import { construirServidor, urlSinSecretos } from '../../../src/http/server.js';
import { crearLogger } from '../../../src/platform/logger.js';
import { RelojFalso } from '../../../src/shared-kernel/reloj.js';
import { configDePrueba, prepararBase } from '../../setup/contexto.js';

const lineas: string[] = [];
let ctx: Contexto;

beforeAll(async () => {
  await prepararBase();
  const destino = new Writable({
    write(chunk, _enc, cb) {
      lineas.push(String(chunk));
      cb();
    },
  });
  ctx = crearContexto(configDePrueba(), {
    mailer: new MailerFalso(),
    reloj: new RelojFalso(),
    almacenamiento: new AlmacenamientoMemoria(),
    logger: crearLogger({ nivel: 'info', destino }),
  });
});

afterAll(async () => {
  await ctx.cerrar();
});

describe('registros de pedidos HTTP sin tokens (auditoría)', () => {
  test('el token del seguimiento y el del enlace al panel no quedan en los registros', async () => {
    const app = await construirServidor(ctx, { sinLimites: true });
    try {
      await app.inject({
        method: 'GET',
        url: '/api/v1/pedidos/0190a0a0-0000-7000-8000-000000000000?t=token-de-seguimiento-secreto&retorno=approved',
      });
      await app.inject({
        method: 'GET',
        url: '/api/v1/auth/verificar?token=enlace-al-panel-secreto',
      });
    } finally {
      await app.close();
    }
    const salida = lineas.join('');
    expect(salida).toContain('request completed');
    expect(salida).toContain('t=oculto&retorno=approved');
    expect(salida).not.toContain('token-de-seguimiento-secreto');
    expect(salida).not.toContain('enlace-al-panel-secreto');
  });

  test('urlSinSecretos deja el resto igual', () => {
    expect(urlSinSecretos('/api/v1/catalogo/productos?marca=sermat&pagina=2')).toBe(
      '/api/v1/catalogo/productos?marca=sermat&pagina=2',
    );
    expect(urlSinSecretos('/api/v1/salud')).toBe('/api/v1/salud');
  });
});
