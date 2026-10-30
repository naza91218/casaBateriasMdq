import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { MAX_INTENTOS } from '../../../src/modules/notificaciones/application/outbox.js';
import { outboxMensajes } from '../../../src/modules/notificaciones/infrastructure/schema.js';
import { MINUTO } from '../../../src/shared-kernel/reloj.js';
import {
  crearContextoDePrueba,
  prepararBase,
  type ContextoDePrueba,
} from '../../setup/contexto.js';

let p: ContextoDePrueba;

beforeAll(async () => {
  await prepararBase();
  p = crearContextoDePrueba();
});

afterAll(async () => {
  await p.ctx.cerrar();
});

beforeEach(async () => {
  await p.ctx.db.delete(outboxMensajes);
});

const mensaje = (clave: string) => ({
  clave,
  canal: 'mail' as const,
  evento: 'pago_confirmado',
  destinatario: 'comprador' as const,
  datos: { email: 'comprador@tienda.test', numero: 1048 },
});

describe('outbox transaccional', () => {
  test('la misma clave se encola una sola vez (FR-040, US4-05)', async () => {
    const { outbox, db } = p.ctx;
    expect(await outbox.encolar(db, mensaje('pago_confirmado:p1:comprador'))).toBe(true);
    expect(await outbox.encolar(db, mensaje('pago_confirmado:p1:comprador'))).toBe(false);
    expect(await db.select().from(outboxMensajes)).toHaveLength(1);
  });

  test('si la transacción que lo origina se revierte, el mensaje no queda', async () => {
    const { outbox, db } = p.ctx;
    await expect(
      db.transaction(async (tx) => {
        await outbox.encolar(tx, mensaje('revertido'));
        throw new Error('falla el cambio de estado');
      }),
    ).rejects.toThrow();
    expect(await db.select().from(outboxMensajes)).toHaveLength(0);
  });

  test('envía y marca como enviado', async () => {
    const { outbox, db } = p.ctx;
    await outbox.encolar(db, mensaje('ok'));
    const enviados: string[] = [];
    const r = await outbox.procesarLote(async (m) => {
      enviados.push(m.clave);
    });
    expect(r.enviados).toBe(1);
    expect(enviados).toEqual(['ok']);
    const [fila] = await db.select().from(outboxMensajes);
    expect(fila?.estado).toBe('enviado');
  });

  test('reintenta con espera 1, 5, 15, 60 min y queda fallido a los 8 intentos (US4-04)', async () => {
    const { outbox, db } = p.ctx;
    await outbox.encolar(db, mensaje('falla'));
    const fallar = async () => {
      throw new Error('Resend caído para comprador@tienda.test');
    };
    const esperas = [1, 5, 15, 60, 60, 60, 60];
    for (const minutos of esperas) {
      await outbox.procesarLote(fallar);
      const [fila] = await db.select().from(outboxMensajes);
      expect(fila?.estado).toBe('pendiente');
      expect(fila?.ultimoError).not.toContain('comprador@tienda.test');
      // Antes de la espera no se vuelve a tomar.
      p.reloj.avanzar(minutos * MINUTO - 1000);
      expect((await outbox.procesarLote(fallar)).reintentos).toBe(0);
      p.reloj.avanzar(1000);
    }
    await outbox.procesarLote(fallar);
    const [fila] = await db.select().from(outboxMensajes).where(eq(outboxMensajes.clave, 'falla'));
    expect(fila?.intentos).toBe(MAX_INTENTOS);
    expect(fila?.estado).toBe('fallido');
  });

  test('dos workers a la vez no procesan el mismo mensaje (SKIP LOCKED)', async () => {
    const { outbox, db } = p.ctx;
    for (let i = 0; i < 6; i++) await outbox.encolar(db, mensaje(`m${i}`));
    const procesados: string[] = [];
    const manejador = async (m: { clave: string }) => {
      await new Promise((r) => setTimeout(r, 20));
      procesados.push(m.clave);
    };
    await Promise.all([outbox.procesarLote(manejador, 3), outbox.procesarLote(manejador, 3)]);
    expect(new Set(procesados).size).toBe(procesados.length);
    expect(procesados).toHaveLength(6);
  });
});
