import { fileURLToPath } from 'node:url';
import { cargarConfig } from './config.js';
import { conectar } from './db.js';
import { sembrarBase } from './seed/base.js';
import { sembrarCatalogo } from './seed/catalogo.js';

/**
 * Lo mínimo para que el sistema funcione en un servidor: usuario del panel, configuración,
 * marcas y medidas (idempotente). El deploy lo corre después de las migraciones. Los datos de
 * ejemplo de desarrollo están en db/seed y no entran en la imagen.
 */
export async function sembrar(url: string, mailAdmin: string): Promise<void> {
  const conexion = conectar(url, { max: 1 });
  try {
    await sembrarBase(conexion.db, { mailAdmin });
    await sembrarCatalogo(conexion.db);
  } finally {
    await conexion.cerrar();
  }
}

// Uso en el servidor: node dist/platform/sembrar.js
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const config = cargarConfig();
  await sembrar(config.DATABASE_URL, config.MAIL_ADMIN);
  console.log('Datos mínimos aplicados');
}
