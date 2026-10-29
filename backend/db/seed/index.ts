// Uso: pnpm --filter backend db:seed
// En desarrollo y staging también carga datos de ejemplo; en producción, solo lo mínimo.
import { cargarConfig } from '../../src/platform/config.js';
import { conectar } from '../../src/platform/db.js';
import { sembrarBase } from './base.js';
import { sembrarCatalogo } from './catalogo.js';
import { sembrarEjemplo } from './ejemplo.js';

const config = cargarConfig();
const conexion = conectar(config.DATABASE_URL, { max: 1 });
try {
  await sembrarBase(conexion.db, { mailAdmin: config.MAIL_ADMIN });
  await sembrarCatalogo(conexion.db);
  if (!config.esProduccion) await sembrarEjemplo(conexion.db);
  console.log('Seed aplicado');
} finally {
  await conexion.cerrar();
}
