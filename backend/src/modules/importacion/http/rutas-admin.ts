import { InformeImportacion, TipoImportacion } from '@casa/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { usuarioActual } from '../../../http/plugins/sesion.js';
import { validacion } from '../../../shared-kernel/errores.js';
import type { ServicioImportacion } from '../application/importar.js';

/**
 * Importación de planillas (contracts/importacion-csv.md). Multipart con el campo `tipo`
 * (productos o compatibilidades) y el archivo en `archivo`.
 */
export function rutasAdminImportacion(deps: {
  importacion: ServicioImportacion;
}): FastifyPluginAsyncZod {
  return async (app) => {
    app.post(
      '/importaciones',
      {
        schema: {
          tags: ['panel-catalogo'],
          consumes: ['multipart/form-data'],
          response: { 200: InformeImportacion },
        },
      },
      async (req) => {
        let tipo: string | undefined;
        let archivo: { nombre: string; contenido: Buffer } | undefined;
        for await (const parte of req.parts()) {
          if (parte.type === 'file') {
            if (parte.fieldname === 'archivo')
              archivo = { nombre: parte.filename, contenido: await parte.toBuffer() };
            else await parte.toBuffer(); // descarta otros archivos sin dejar el stream colgado
          } else if (parte.fieldname === 'tipo') {
            tipo = String(parte.value);
          }
        }
        const tipoValido = TipoImportacion.safeParse(tipo);
        if (!tipoValido.success)
          throw validacion({ tipo: 'Elegí si la planilla es de productos o de compatibilidades' });
        if (!archivo) throw validacion({ archivo: 'Elegí la planilla (archivo CSV)' });
        return deps.importacion.importar(
          tipoValido.data,
          archivo.nombre,
          archivo.contenido,
          usuarioActual(req).id,
        );
      },
    );
  };
}
