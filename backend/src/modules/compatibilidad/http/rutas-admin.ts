import {
  DatosVehiculo,
  FiltroVehiculosAdmin,
  ListaVehiculosAdmin,
  VehiculoAdmin,
} from '@casa/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { ServicioAdminVehiculos } from '../application/admin-vehiculos.js';

/** Autos y sus medidas en el panel (FR-048). Se registran bajo /admin, que ya exige sesión. */
export function rutasAdminVehiculos(deps: {
  vehiculos: ServicioAdminVehiculos;
}): FastifyPluginAsyncZod {
  return async (app) => {
    const tags = ['panel-catalogo'];
    const params = z.object({ id: z.string().uuid('Auto inválido') });

    app.get(
      '/vehiculos',
      {
        schema: { tags, querystring: FiltroVehiculosAdmin, response: { 200: ListaVehiculosAdmin } },
      },
      (req) => deps.vehiculos.listar(req.query),
    );

    app.post(
      '/vehiculos',
      { schema: { tags, body: DatosVehiculo, response: { 201: VehiculoAdmin } } },
      async (req, reply) => reply.code(201).send(await deps.vehiculos.crear(req.body)),
    );

    app.patch(
      '/vehiculos/:id',
      { schema: { tags, params, body: DatosVehiculo, response: { 200: VehiculoAdmin } } },
      (req) => deps.vehiculos.editar(req.params.id, req.body),
    );

    app.delete('/vehiculos/:id', { schema: { tags, params } }, async (req, reply) => {
      await deps.vehiculos.borrar(req.params.id);
      return reply.code(204).send();
    });
  };
}
