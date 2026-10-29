import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { conectar } from './db.js';

export const CARPETA_MIGRACIONES = fileURLToPath(new URL('../../db/migrations', import.meta.url));

export async function migrar(url: string): Promise<void> {
  const conexion = conectar(url, { max: 1 });
  try {
    await migrate(conexion.db, { migrationsFolder: CARPETA_MIGRACIONES });
  } finally {
    await conexion.cerrar();
  }
}

// Uso: pnpm --filter backend db:migrate
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('Falta DATABASE_URL');
  await migrar(url);
  console.log('Migraciones aplicadas');
}
