// Uso: pnpm --filter backend db:seed
import { cargarConfig } from '../../src/platform/config.js';
import { conectar } from '../../src/platform/db.js';
import { sembrarBase } from './base.js';

const config = cargarConfig();
const conexion = conectar(config.DATABASE_URL, { max: 1 });
try {
  await sembrarBase(conexion.db, { mailAdmin: config.MAIL_ADMIN });
  console.log('Seed aplicado');
} finally {
  await conexion.cerrar();
}
