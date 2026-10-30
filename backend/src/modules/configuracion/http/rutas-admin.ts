import { ConfiguracionAdmin, DatosZona, EdicionConfiguracion, EdicionZona, ZonaAdmin } from '@casa/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { ServicioAdminConfiguracion } from '../application/admin-configuracion.js';

/** Configuración y zonas de colocación en el panel (FR-047). Bajo /admin, que ya exige sesión. */
export function rutasAdminConfiguracion(deps: { configuracion: ServicioAdminConfiguracion }): FastifyPluginAsyncZod {
  return async (app) => {
    const tags = ['panel-configuracion'];

    app.get('/configuracion', { schema: { tags, response: { 200: ConfiguracionAdmin } } }, () => deps.configuracion.obtener());

    app.patch('/configuracion', { schema: { tags, body: EdicionConfiguracion, response: { 200: ConfiguracionAdmin } } }, (req) =>
      deps.configuracion.editar(req.body),
    );

    app.get('/zonas', { schema: { tags, response: { 200: z.array(ZonaAdmin) } } }, () => deps.configuracion.listarZonas());

    app.post('/zonas', { schema: { tags, body: DatosZona, response: { 201: ZonaAdmin } } }, async (req, reply) =>
      reply.code(201).send(await deps.configuracion.crearZona(req.body)),
    );

    app.patch(
      '/zonas/:id',
      { schema: { tags, params: z.object({ id: z.string().uuid('Zona inválida') }), body: EdicionZona, response: { 200: ZonaAdmin } } },
      (req) => deps.configuracion.editarZona(req.params.id, req.body),
    );
  };
}
