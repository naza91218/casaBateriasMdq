import {
  ConsultaAnios,
  ConsultaCompatibles,
  ConsultaModelos,
  OpcionVehiculo,
  ResultadoCompatibles,
} from '@casa/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { ServicioBuscador } from '../application/buscador.js';

export function rutasBuscador(deps: { buscador: ServicioBuscador }): FastifyPluginAsyncZod {
  return async (app) => {
    const tags = ['buscador'];

    app.get('/vehiculos/marcas', { schema: { tags, response: { 200: z.array(OpcionVehiculo) } } }, () =>
      deps.buscador.marcas(),
    );

    app.get(
      '/vehiculos/modelos',
      { schema: { tags, querystring: ConsultaModelos, response: { 200: z.array(OpcionVehiculo) } } },
      (req) => deps.buscador.modelos(req.query.marca),
    );

    app.get(
      '/vehiculos/anios',
      { schema: { tags, querystring: ConsultaAnios, response: { 200: z.array(z.number().int()) } } },
      (req) => deps.buscador.anios(req.query.marca, req.query.modelo),
    );

    app.get(
      '/vehiculos/compatibles',
      { schema: { tags, querystring: ConsultaCompatibles, response: { 200: ResultadoCompatibles } } },
      (req) => deps.buscador.compatibles(req.query.marca, req.query.modelo, req.query.anio),
    );
  };
}
