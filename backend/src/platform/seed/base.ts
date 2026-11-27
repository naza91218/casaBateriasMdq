import type { BaseDeDatos } from '../../platform/db.js';
import { usuariosPanel } from '../../modules/auth/infrastructure/schema.js';
import { configuracion } from '../../modules/configuracion/infrastructure/schema.js';
import { zonasColocacion } from '../../modules/entregas/infrastructure/schema.js';

/**
 * Datos mínimos para que el sistema funcione (idempotente). Las marcas y medidas se siembran en
 * T057, después de crear sus tablas. Los datos del comercio y bancarios quedan vacíos hasta que
 * el cliente los pase (se editan desde el panel).
 */
export async function sembrarBase(db: BaseDeDatos, opciones: { mailAdmin: string }): Promise<void> {
  await db
    .insert(configuracion)
    .values({ id: 1, comercioDomicilio: 'Av. Juan B. Justo 5766, Mar del Plata' })
    .onConflictDoNothing();
  await db.insert(zonasColocacion).values({ nombre: 'Mar del Plata' }).onConflictDoNothing();
  await db.insert(usuariosPanel).values({ email: opciones.mailAdmin }).onConflictDoNothing();
}
