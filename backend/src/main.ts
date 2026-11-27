import { crearContexto } from './composition-root.js';
import { construirServidor } from './http/server.js';
import { cargarConfig } from './platform/config.js';
import { iniciarSentry } from './platform/sentry.js';

const config = cargarConfig();
const reportarError = iniciarSentry({ dsn: config.SENTRY_DSN, entorno: config.NODE_ENV });
const ctx = crearContexto(config);
const app = await construirServidor(ctx, { reportarError });

const cerrar = async () => {
  await app.close();
  await ctx.cerrar();
  process.exit(0);
};
process.on('SIGTERM', cerrar);
process.on('SIGINT', cerrar);

await app.listen({ port: config.PORT, host: '0.0.0.0' });
