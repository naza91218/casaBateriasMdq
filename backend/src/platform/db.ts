import { sql } from 'drizzle-orm';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

export type BaseDeDatos = PostgresJsDatabase<typeof schema>;
export type Transaccion = Parameters<Parameters<BaseDeDatos['transaction']>[0]>[0];
/** Cualquier cosa que pueda ejecutar consultas: la base o una transacción en curso. */
export type Ejecutor = BaseDeDatos | Transaccion;

export interface ConexionDb {
  db: BaseDeDatos;
  cerrar(): Promise<void>;
  verificar(): Promise<boolean>;
}

export function conectar(url: string, opciones: { max?: number } = {}): ConexionDb {
  const cliente = postgres(url, { max: opciones.max ?? 10, onnotice: () => {} });
  const db = drizzle(cliente, { schema });
  return {
    db,
    cerrar: () => cliente.end({ timeout: 5 }),
    async verificar() {
      try {
        await db.execute(sql`select 1`);
        return true;
      } catch {
        return false;
      }
    },
  };
}

export { schema };
