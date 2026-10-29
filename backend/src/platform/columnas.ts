import { bigint, customType, timestamp, uuid } from 'drizzle-orm/pg-core';
import { uuidv7 } from './ids.js';

/** Helpers de columnas comunes a todos los esquemas. */
export const idUuid = (nombre = 'id') =>
  uuid(nombre)
    .primaryKey()
    .$defaultFn(() => uuidv7());

export const fecha = (nombre: string) => timestamp(nombre, { withTimezone: true, mode: 'date' });

export const creadoEn = () => fecha('creado_en').notNull().defaultNow();

export const actualizadoEn = () =>
  fecha('actualizado_en')
    .notNull()
    .defaultNow()
    .$onUpdateFn(() => new Date());

/** Importe en centavos enteros. */
export const centavos = (nombre: string) => bigint(nombre, { mode: 'bigint' });

/** Texto sin distinguir mayúsculas (mails). Requiere la extensión citext. */
export const citext = customType<{ data: string }>({
  dataType() {
    return 'citext';
  },
});
