import type { Mailer, Revalidador } from '../../../shared-kernel/puertos.js';
import { renderizar } from '../plantillas/index.js';
import type { MensajeOutbox } from './outbox.js';

/** Decide qué hacer con cada mensaje del outbox según su canal. Lo usa el worker. */
export function crearDespachador(deps: {
  mailer: Mailer;
  revalidador: Revalidador;
  mailAdmin: string;
}): (mensaje: MensajeOutbox) => Promise<void> {
  return async (mensaje) => {
    if (mensaje.canal === 'revalidacion') {
      const etiquetas = mensaje.datos.etiquetas;
      await deps.revalidador.revalidar(Array.isArray(etiquetas) ? etiquetas.map(String) : []);
      return;
    }
    const para =
      mensaje.destinatario === 'admin' ? deps.mailAdmin : String(mensaje.datos.email ?? '');
    if (!para) throw new Error('Mensaje sin destinatario');
    await deps.mailer.enviar({ para, ...renderizar(mensaje.evento, mensaje.datos) });
  };
}
