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
import { AlmacenamientoDisco, claveValida } from '../adapters/almacenamiento.js';
import type { Contexto } from '../composition-root.js';
import { rutasAdminCanje } from '../modules/canje/http/rutas-admin.js';
import { rutasAdminProductos } from '../modules/catalogo/http/rutas-admin.js';
import { rutasAdminVehiculos } from '../modules/compatibilidad/http/rutas-admin.js';
import { rutasAdminConfiguracion } from '../modules/configuracion/http/rutas-admin.js';
import { rutasAdminImportacion } from '../modules/importacion/http/rutas-admin.js';
import { rutasAuth } from '../modules/auth/http/rutas.js';
import { rutasCanje } from '../modules/canje/http/rutas.js';
import { rutasSeo } from '../modules/catalogo/http/rutas-seo.js';
import { rutasAdminLegales } from '../modules/legales/http/rutas-admin.js';
import { rutasLegales } from '../modules/legales/http/rutas.js';
import { rutasCatalogo } from '../modules/catalogo/http/rutas.js';
import { rutasAdminAlertas } from '../modules/pagos/http/rutas-admin.js';
import { rutasWebhookMercadoPago } from '../modules/pagos/http/webhook.js';
import { rutasAdminPedidos } from '../modules/pedidos/http/rutas-admin.js';
import { rutasPedidos } from '../modules/pedidos/http/rutas.js';
import { rutasBuscador } from '../modules/compatibilidad/http/rutas.js';
import { rutasConfiguracion } from '../modules/configuracion/http/rutas.js';
import { registrarManejoDeErrores } from './plugins/errores.js';
import { requiereSesion } from './plugins/sesion.js';
import { rutasAdminResumen } from './rutas-admin-resumen.js';

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
    // En tests se saltean todos los límites, incluidos los de cada ruta.
    ...(opciones.sinLimites ? { allowList: () => true } : {}),
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
      await api.register(rutasCatalogo({ catalogo: ctx.servicios.catalogo }));
      await api.register(
        rutasBuscador({ buscador: ctx.servicios.buscador, paginaVehiculo: ctx.servicios.paginaVehiculo }),
      );
      await api.register(rutasSeo({ indice: ctx.servicios.indiceSeo }));
      await api.register(
        rutasPedidos({ pedidos: ctx.servicios.pedidos, seguimiento: ctx.servicios.seguimiento }),
      );
      await api.register(rutasCanje({ canje: ctx.servicios.canje }));
      await api.register(rutasLegales({ arrepentimientos: ctx.servicios.arrepentimientos }));
      await api.register(rutasWebhookMercadoPago({ pagos: ctx.servicios.pagosMp }));
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
          // onRequest: la sesión se verifica antes de leer o validar el body (sin sesión siempre es 401).
          admin.addHook('onRequest', requiereSesion(ctx.servicios.auth));
          const s = ctx.servicios;
          await admin.register(
            rutasAdminResumen({ panel: s.panelPedidos, alertas: s.alertas, productos: s.adminProductos, canje: s.adminCanje }),
          );
          await admin.register(
            rutasAdminPedidos({ panel: s.panelPedidos, pagosManuales: s.pagosManuales, anonimizacion: s.anonimizacion }),
          );
          await admin.register(rutasAdminAlertas({ alertas: s.alertas }));
          await admin.register(rutasAdminProductos({ productos: s.adminProductos, fotos: s.fotos }));
          await admin.register(rutasAdminImportacion({ importacion: s.importacion }));
          await admin.register(rutasAdminVehiculos({ vehiculos: s.adminVehiculos }));
          await admin.register(rutasAdminConfiguracion({ configuracion: s.adminConfiguracion }));
          await admin.register(rutasAdminCanje({ canje: s.adminCanje }));
          await admin.register(rutasAdminLegales({ arrepentimientos: s.arrepentimientos }));
        },
        { prefix: '/admin' },
      );
    },
    { prefix: PREFIJO },
  );

  // Desarrollo sin R2: la API sirve las fotos guardadas en disco.
  const almacenamiento = ctx.almacenamiento;
  if (almacenamiento instanceof AlmacenamientoDisco) {
    app.get('/uploads/*', async (req, reply) => {
      const clave = (req.params as { '*': string })['*'];
      if (!claveValida(clave)) return reply.code(404).send();
      try {
        const contenido = await almacenamiento.leer(clave);
        return reply.header('content-type', clave.endsWith('.webp') ? 'image/webp' : 'image/jpeg').send(contenido);
      } catch {
        return reply.code(404).send();
      }
    });
  }

  return base;
}
