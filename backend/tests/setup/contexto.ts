import { sql } from 'drizzle-orm';
import { MailerFalso } from '../../src/adapters/mailer.js';
import { crearContexto, type Contexto } from '../../src/composition-root.js';
import { cargarConfig, type Config } from '../../src/platform/config.js';
import { conectar } from '../../src/platform/db.js';
import { crearLogger } from '../../src/platform/logger.js';
import { migrar } from '../../src/platform/migrar.js';
import { RelojFalso } from '../../src/shared-kernel/reloj.js';

export const URL_BASE_PRUEBA =
  process.env.TEST_DATABASE_URL ?? 'postgres://casa:casa@localhost:5433/casa_test';

export function configDePrueba(extra: Record<string, string> = {}): Config {
  return cargarConfig({
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
    DATABASE_URL: URL_BASE_PRUEBA,
    API_PUBLIC_URL: 'http://api.test',
    FRONTEND_URL: 'http://tienda.test',
    REVALIDATE_SECRET: 'secreto-de-prueba-123',
    DNI_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64'),
    MAIL_FROM: 'Tienda <pedidos@tienda.test>',
    MAIL_ADMIN: 'admin@tienda.test',
    ...extra,
  });
}

/** Deja la base de pruebas vacía y con todas las migraciones aplicadas. */
export async function prepararBase(): Promise<void> {
  const conexion = conectar(URL_BASE_PRUEBA, { max: 1 });
  try {
    await conexion.db.execute(sql`drop schema if exists public cascade`);
    await conexion.db.execute(sql`drop schema if exists drizzle cascade`);
    await conexion.db.execute(sql`create schema public`);
  } catch (error) {
    throw new Error(
      `No se pudo conectar a la base de pruebas (${URL_BASE_PRUEBA}). ` +
        'Levantala con: docker compose -f infra/docker-compose.dev.yml up -d',
      { cause: error },
    );
  } finally {
    await conexion.cerrar();
  }
  await migrar(URL_BASE_PRUEBA);
}

export interface ContextoDePrueba {
  ctx: Contexto;
  mailer: MailerFalso;
  reloj: RelojFalso;
}

/** Contexto real (base de pruebas) con mailer y reloj falsos. */
export function crearContextoDePrueba(extra: Record<string, string> = {}): ContextoDePrueba {
  const mailer = new MailerFalso();
  const reloj = new RelojFalso();
  const ctx = crearContexto(configDePrueba(extra), {
    mailer,
    reloj,
    logger: crearLogger({ nivel: 'silent' }),
  });
  return { ctx, mailer, reloj };
}
