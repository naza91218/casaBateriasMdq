import {
  EdicionProducto,
  FiltroProductosAdmin,
  FotoAdmin,
  ListaProductosAdmin,
  NuevoProducto,
  OrdenFotos,
  ProductoAdmin,
  ResultadoEliminacion,
  ResultadoRevision,
  RevisionProductos,
} from '@casa/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { validacion } from '../../../shared-kernel/errores.js';
import type { ServicioAdminProductos } from '../application/admin-productos.js';
import { MAX_FOTOS, type ServicioFotos } from '../application/fotos.js';

/** Productos y fotos en el panel (US5). Se registran bajo /admin, que ya exige sesión. */
export function rutasAdminProductos(deps: {
  productos: ServicioAdminProductos;
  fotos: ServicioFotos;
}): FastifyPluginAsyncZod {
  return async (app) => {
    const tags = ['panel-catalogo'];
    const params = z.object({ id: z.string().uuid('Producto inválido') });
    const fotos = z.array(FotoAdmin);

    app.get('/productos', { schema: { tags, querystring: FiltroProductosAdmin, response: { 200: ListaProductosAdmin } } }, (req) =>
      deps.productos.listar(req.query),
    );

    app.post('/productos', { schema: { tags, body: NuevoProducto, response: { 201: ProductoAdmin } } }, async (req, reply) =>
      reply.code(201).send(await deps.productos.crear(req.body)),
    );

    app.post(
      '/productos/revision',
      { schema: { tags, body: RevisionProductos, response: { 200: ResultadoRevision } } },
      (req) => deps.productos.revisar(req.body),
    );

    app.get('/productos/:id', { schema: { tags, params, response: { 200: ProductoAdmin } } }, (req) =>
      deps.productos.obtener(req.params.id),
    );

    app.patch('/productos/:id', { schema: { tags, params, body: EdicionProducto, response: { 200: ProductoAdmin } } }, (req) =>
      deps.productos.editar(req.params.id, req.body),
    );

    app.delete('/productos/:id', { schema: { tags, params, response: { 200: ResultadoEliminacion } } }, (req) =>
      deps.productos.eliminar(req.params.id),
    );

    // Multipart: una o varias fotos en el campo "fotos" (desde el celular, FR-045).
    app.post(
      '/productos/:id/fotos',
      { schema: { tags, params, consumes: ['multipart/form-data'], response: { 201: fotos } } },
      async (req, reply) => {
        let subidas = 0;
        for await (const parte of req.files()) {
          if (++subidas > MAX_FOTOS) throw validacion({ fotos: `Podés subir hasta ${MAX_FOTOS} fotos a la vez` });
          await deps.fotos.subir(req.params.id, await parte.toBuffer());
        }
        if (subidas === 0) throw validacion({ fotos: 'Elegí al menos una foto' });
        return reply.code(201).send(await deps.fotos.deProducto(req.params.id));
      },
    );

    app.patch('/productos/:id/fotos/orden', { schema: { tags, params, body: OrdenFotos, response: { 200: fotos } } }, (req) =>
      deps.fotos.ordenar(req.params.id, req.body.ids),
    );

    app.delete(
      '/productos/:id/fotos/:fotoId',
      { schema: { tags, params: params.extend({ fotoId: z.string().uuid('Foto inválida') }), response: { 200: fotos } } },
      (req) => deps.fotos.borrar(req.params.id, req.params.fotoId),
    );
  };
}
