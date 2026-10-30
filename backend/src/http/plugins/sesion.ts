import type { FastifyReply, FastifyRequest } from 'fastify';
import type { ServicioAuth, UsuarioPanel } from '../../modules/auth/application/auth.js';
import { COOKIE_SESION } from '../../modules/auth/http/rutas.js';
import { ErrorDeDominio } from '../../shared-kernel/errores.js';

declare module 'fastify' {
  interface FastifyRequest {
    usuario: UsuarioPanel | null;
  }
}

/**
 * Hook onRequest para todas las rutas /admin (FR-041): sin sesión válida responde 401.
 * Deja el usuario en `request.usuario` para registrar quién hizo cada cambio.
 */
export function requiereSesion(auth: ServicioAuth) {
  return async (req: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    const id = req.cookies[COOKIE_SESION];
    const usuario = id ? await auth.usuarioDeSesion(id) : null;
    if (!usuario) {
      throw new ErrorDeDominio('no_autorizado', 'SIN_SESION', 'Tenés que ingresar al panel');
    }
    req.usuario = usuario;
  };
}

/** Para usar dentro de un handler /admin: el usuario ya fue validado por requiereSesion. */
export function usuarioActual(req: FastifyRequest): UsuarioPanel {
  if (!req.usuario) {
    throw new ErrorDeDominio('no_autorizado', 'SIN_SESION', 'Tenés que ingresar al panel');
  }
  return req.usuario;
}
