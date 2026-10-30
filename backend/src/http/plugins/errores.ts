import type { FastifyError, FastifyInstance } from 'fastify';
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod';
import { ESTADO_HTTP, ErrorDeDominio } from '../../shared-kernel/errores.js';
import { errorSinDatosPersonales } from '../../shared-kernel/privacidad.js';

interface CuerpoError {
  error: { codigo: string; mensaje: string; campos?: Record<string, string> };
}

/**
 * Formato único de error (contracts/api-rest.md). Nunca se devuelve ni se registra el cuerpo del
 * request: puede traer DNI, dirección o teléfono (FR-059).
 */
export function registrarManejoDeErrores(
  app: FastifyInstance,
  opciones: { reportar?: (error: unknown) => void } = {},
): void {
  app.setNotFoundHandler((_req, reply) => {
    const cuerpo: CuerpoError = {
      error: { codigo: 'NO_ENCONTRADO', mensaje: 'No encontramos lo que buscás' },
    };
    return reply.code(404).send(cuerpo);
  });

  app.setErrorHandler((error: FastifyError | ErrorDeDominio, req, reply) => {
    if (error instanceof ErrorDeDominio) {
      const cuerpo: CuerpoError = {
        error: {
          codigo: error.codigo,
          mensaje: error.mensaje,
          ...(error.campos ? { campos: error.campos } : {}),
          ...(error.datos ?? {}),
        },
      };
      return reply.code(ESTADO_HTTP[error.tipo]).send(cuerpo);
    }

    if (hasZodFastifySchemaValidationErrors(error)) {
      const campos: Record<string, string> = {};
      for (const item of error.validation) {
        const ruta = item.instancePath.replace(/^\//, '').replaceAll('/', '.') || 'general';
        campos[ruta] ??= item.message ?? 'Dato inválido';
      }
      const cuerpo: CuerpoError = {
        error: { codigo: 'VALIDACION', mensaje: 'Revisá los datos marcados', campos },
      };
      return reply.code(400).send(cuerpo);
    }

    if (error.statusCode === 429) {
      const cuerpo: CuerpoError = {
        error: { codigo: 'LIMITE', mensaje: 'Hiciste muchos intentos seguidos. Probá en un minuto.' },
      };
      return reply.code(429).send(cuerpo);
    }

    if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
      const cuerpo: CuerpoError = {
        error: { codigo: 'SOLICITUD_INVALIDA', mensaje: 'No pudimos procesar el pedido' },
      };
      return reply.code(error.statusCode).send(cuerpo);
    }

    // Un error de la base puede traer en el mensaje valores de la fila (DNI, teléfono, mail):
    // se registra y se reporta una copia limpia, sin las propiedades extra del original.
    const limpio = errorSinDatosPersonales(error);
    req.log.error({ err: { name: limpio.name, message: limpio.message, stack: limpio.stack } }, 'error no controlado');
    opciones.reportar?.(limpio);
    const cuerpo: CuerpoError = {
      error: { codigo: 'ERROR_INTERNO', mensaje: 'Algo salió mal. Probá de nuevo en un rato.' },
    };
    return reply.code(500).send(cuerpo);
  });
}
