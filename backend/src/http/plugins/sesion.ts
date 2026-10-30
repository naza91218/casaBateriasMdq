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

const SIN_EFECTOS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Defensa contra pedidos falsificados desde otro sitio (CSRF), además de la cookie SameSite=Lax:
 * una acción del panel que llega desde un navegador tiene que venir de la tienda. Sin cabecera
 * Origin (herramientas, servidor a servidor) no hay navegador del que abusar.
 */
export function soloDesdeLaTienda(urls: string[]) {
  const permitidos = new Set(urls.map((u) => new URL(u).origin));
  return async (req: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    if (SIN_EFECTOS.has(req.method)) return;
    const origen = req.headers.origin;
    const desdeOtroSitio = req.headers['sec-fetch-site'] === 'cross-site';
    if ((origen && !permitidos.has(origen)) || desdeOtroSitio) {
      throw new ErrorDeDominio(
        'prohibido',
        'ORIGEN_NO_PERMITIDO',
        'Esta acción solo se puede hacer desde el panel',
      );
    }
  };
}

/** Para usar dentro de un handler /admin: el usuario ya fue validado por requiereSesion. */
export function usuarioActual(req: FastifyRequest): UsuarioPanel {
  if (!req.usuario) {
    throw new ErrorDeDominio('no_autorizado', 'SIN_SESION', 'Tenés que ingresar al panel');
  }
  return req.usuario;
}
