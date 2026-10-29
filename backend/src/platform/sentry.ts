import * as Sentry from '@sentry/node';

/**
 * Reporte de errores (FR-063). `beforeSend` borra cuerpos de request, cookies y cabeceras para
 * que nunca viajen datos personales (FR-059).
 */
export function iniciarSentry(opciones: { dsn?: string; entorno: string }): (e: unknown) => void {
  if (!opciones.dsn) return () => {};
  Sentry.init({
    dsn: opciones.dsn,
    environment: opciones.entorno,
    sendDefaultPii: false,
    beforeSend(evento) {
      if (evento.request) {
        delete evento.request.data;
        delete evento.request.cookies;
        delete evento.request.headers;
        delete evento.request.query_string;
      }
      delete evento.user;
      return evento;
    },
  });
  return (error) => Sentry.captureException(error);
}
