import { ConfiguracionPublica } from '@casa/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { ServicioConfiguracion } from '../application/configuracion.js';

export function rutasConfiguracion(deps: {
  configuracion: ServicioConfiguracion;
}): FastifyPluginAsyncZod {
  return async (app) => {
    app.get(
      '/configuracion/publica',
      { schema: { tags: ['configuracion'], response: { 200: ConfiguracionPublica } } },
      async () => deps.configuracion.obtenerPublica(),
    );
  };
}
