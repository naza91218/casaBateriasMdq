import type { FastifyReply } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { ErrorDeDominio } from '../../../shared-kernel/errores.js';
import type { ServicioAuth } from '../application/auth.js';
import { VIGENCIA_SESION } from '../application/auth.js';

export const COOKIE_SESION = 'sesion';

const MENSAJE_ENLACE = 'Si el mail está autorizado, te mandamos un enlace para entrar.';

export function rutasAuth(deps: {
  auth: ServicioAuth;
  urlFrontend: string;
  cookieSegura: boolean;
  /** Solo la demo: mail con el que /auth/demo entra directo. Sin valor, la ruta no existe. */
  ingresoDirecto?: string;
}): FastifyPluginAsyncZod {
  return async (app) => {
    const guardarSesion = (reply: FastifyReply, idSesion: string) =>
      reply.setCookie(COOKIE_SESION, idSesion, {
        httpOnly: true,
        secure: deps.cookieSegura,
        sameSite: 'lax',
        path: '/',
        maxAge: VIGENCIA_SESION / 1000,
      });

    app.post(
      '/auth/enlace',
      {
        config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
        schema: {
          tags: ['auth'],
          body: z.object({ email: z.string().trim().email('Escribí un mail válido') }),
          response: { 202: z.object({ mensaje: z.string() }) },
        },
      },
      async (req, reply) => {
        await deps.auth.pedirEnlace(req.body.email);
        return reply.code(202).send({ mensaje: MENSAJE_ENLACE });
      },
    );

    app.post(
      '/auth/ingresar',
      {
        // Contra el que prueba contraseñas: pocos intentos por minuto y por IP.
        config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
        schema: {
          tags: ['auth'],
          body: z.object({
            email: z.string().trim().email('Escribí un mail válido'),
            clave: z.string().min(1, 'Escribí tu contraseña').max(200),
          }),
          response: { 204: z.null() },
        },
      },
      async (req, reply) => {
        const sesion = await deps.auth.ingresarConClave(req.body.email, req.body.clave);
        if (!sesion) {
          throw new ErrorDeDominio(
            'no_autorizado',
            'CREDENCIALES',
            'El mail o la contraseña no son correctos',
          );
        }
        guardarSesion(reply, sesion.idSesion);
        return reply.code(204).send(null);
      },
    );

    app.post(
      '/auth/clave',
      {
        config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
        schema: {
          tags: ['auth'],
          body: z.object({
            actual: z.string().max(200).optional(),
            nueva: z.string().max(200),
          }),
          response: { 204: z.null() },
        },
      },
      async (req, reply) => {
        const id = req.cookies[COOKIE_SESION];
        const usuario = id ? await deps.auth.usuarioDeSesion(id) : null;
        if (!id || !usuario) {
          throw new ErrorDeDominio('no_autorizado', 'SIN_SESION', 'Tenés que ingresar al panel');
        }
        await deps.auth.cambiarClave(usuario.id, id, req.body);
        return reply.code(204).send(null);
      },
    );

    app.get(
      '/auth/verificar',
      {
        config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
        schema: { tags: ['auth'], querystring: z.object({ token: z.string().min(1) }) },
      },
      async (req, reply) => {
        const sesion = await deps.auth.verificarEnlace(req.query.token);
        if (!sesion) {
          return reply.redirect(`${deps.urlFrontend}/panel/ingresar?error=enlace_vencido`);
        }
        guardarSesion(reply, sesion.idSesion);
        return reply.redirect(`${deps.urlFrontend}/panel`);
      },
    );

    const email = deps.ingresoDirecto;
    if (email) {
      app.get('/auth/demo', { schema: { tags: ['auth'] } }, async (_req, reply) => {
        const sesion = await deps.auth.ingresoDirecto(email);
        if (!sesion) return reply.redirect(`${deps.urlFrontend}/panel/ingresar`);
        guardarSesion(reply, sesion.idSesion);
        return reply.redirect(`${deps.urlFrontend}/panel`);
      });
    }

    app.get(
      '/auth/sesion',
      {
        schema: {
          tags: ['auth'],
          response: {
            200: z.object({
              usuario: z.object({
                id: z.string(),
                email: z.string(),
                rol: z.string(),
                tieneClave: z.boolean(),
              }),
            }),
          },
        },
      },
      async (req) => {
        const id = req.cookies[COOKIE_SESION];
        const usuario = id ? await deps.auth.usuarioDeSesion(id) : null;
        if (!usuario) {
          throw new ErrorDeDominio('no_autorizado', 'SIN_SESION', 'Tenés que ingresar al panel');
        }
        return { usuario: { ...usuario, tieneClave: await deps.auth.tieneClave(usuario.id) } };
      },
    );

    app.post('/auth/salir', { schema: { tags: ['auth'] } }, async (req, reply) => {
      const id = req.cookies[COOKIE_SESION];
      if (id) await deps.auth.cerrarSesion(id);
      reply.clearCookie(COOKIE_SESION, { path: '/' });
      return reply.code(204).send();
    });
  };
}
