import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import Fastify, { type FastifyBaseLogger, type FastifyInstance } from 'fastify';
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { Contexto } from '../composition-root.js';
import { rutasAuth } from '../modules/auth/http/rutas.js';
import { rutasConfiguracion } from '../modules/configuracion/http/rutas.js';
import { registrarManejoDeErrores } from './plugins/errores.js';
import { requiereSesion } from './plugins/sesion.js';

export const PREFIJO = '/api/v1';

export interface OpcionesServidor {
  reportarError?: (error: unknown) => void;
  /** Para tests: desactiva el rate limit global. */
  sinLimites?: boolean;
}

/**
 * Arma la API sin escuchar en un puerto: main.ts la levanta y los tests la usan con inject().
 * Las rutas de cada módulo son delgadas: validan con Zod y llaman a un servicio.
 */
export async function construirServidor(
  ctx: Contexto,
  opciones: OpcionesServidor = {},
): Promise<FastifyInstance> {
  const base = Fastify({
    loggerInstance: ctx.logger as FastifyBaseLogger,
    trustProxy: true, // detrás de Nginx: la IP real llega en X-Forwarded-For (rate limit)
  });
  registrarManejoDeErrores(base, opciones.reportarError ? { reportar: opciones.reportarError } : {});
  base.setValidatorCompiler(validatorCompiler);
  base.setSerializerCompiler(serializerCompiler);
  base.decorateRequest('usuario', null);
  const app = base.withTypeProvider<ZodTypeProvider>();

  await app.register(cookie);
  await app.register(multipart, { limits: { fileSize: 5 * 1024 * 1024, files: 10 } });
  await app.register(rateLimit, {
    global: false,
    ...(opciones.sinLimites ? { max: Number.MAX_SAFE_INTEGER } : {}),
  });

  if (!ctx.config.esProduccion) {
    await app.register(swagger, {
      openapi: {
        info: { title: 'API La Casa de las Baterías', version: '1.0.0' },
        servers: [{ url: ctx.config.API_PUBLIC_URL }],
      },
      transform: jsonSchemaTransform,
    });
    await app.register(swaggerUi, { routePrefix: `${PREFIJO}/docs` });
  }

  await app.register(
    async (api) => {
      api.get(
        '/salud',
        {
          schema: {
            tags: ['operacion'],
            response: { 200: z.object({ estado: z.literal('ok') }), 503: z.object({ estado: z.literal('sin_base') }) },
          },
        },
        async (_req, reply) =>
          (await ctx.conexion.verificar())
            ? reply.send({ estado: 'ok' as const })
            : reply.code(503).send({ estado: 'sin_base' as const }),
      );

      // Públicas
      await api.register(rutasConfiguracion({ configuracion: ctx.servicios.configuracion }));
      await api.register(
        rutasAuth({
          auth: ctx.servicios.auth,
          urlFrontend: ctx.config.FRONTEND_URL,
          cookieSegura: ctx.config.NODE_ENV !== 'development' && ctx.config.NODE_ENV !== 'test',
        }),
      );

      // Panel: todo lo que está bajo /admin exige sesión.
      await api.register(
        async (admin) => {
          admin.addHook('preHandler', requiereSesion(ctx.servicios.auth));
          // Las rutas /admin de cada módulo se registran acá (fases 5 en adelante).
        },
        { prefix: '/admin' },
      );
    },
    { prefix: PREFIJO },
  );

  return base;
}
