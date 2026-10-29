import { FichaProducto, FiltrosCatalogo, ListadoProductos, MarcaCatalogo, Medida } from '@casa/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { ServicioCatalogo } from '../application/catalogo.js';

export function rutasCatalogo(deps: { catalogo: ServicioCatalogo }): FastifyPluginAsyncZod {
  return async (app) => {
    const tags = ['catalogo'];

    app.get('/catalogo/marcas', { schema: { tags, response: { 200: z.array(MarcaCatalogo) } } }, () =>
      deps.catalogo.marcas(),
    );

    app.get('/catalogo/medidas', { schema: { tags, response: { 200: z.array(Medida) } } }, () =>
      deps.catalogo.medidas(),
    );

    app.get(
      '/catalogo/productos',
      { schema: { tags, querystring: FiltrosCatalogo, response: { 200: ListadoProductos } } },
      (req) => deps.catalogo.listar(req.query),
    );

    app.get(
      '/catalogo/productos/:slug',
      {
        schema: {
          tags,
          params: z.object({ slug: z.string().min(1) }),
          response: { 200: FichaProducto },
        },
      },
      (req) => deps.catalogo.obtenerFicha(req.params.slug),
    );
  };
}
