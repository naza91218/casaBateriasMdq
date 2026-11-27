import type { NuevoMensaje } from './outbox.js';

// Qué mail sale ante cada hecho y a quién (T116, FR-036, FR-037). Cada evento tiene su
// plantilla en `plantillas/`; un test verifica que no falte ninguna.

/** Al comprador, según el estado al que llega su pedido. */
export const MAIL_COMPRADOR_POR_ESTADO: Readonly<Partial<Record<string, string>>> = {
  pagado: 'pago_confirmado',
  en_camino: 'en_camino',
  listo_para_retirar: 'listo_para_retirar',
  entregado: 'entregado',
  cancelado: 'cancelado',
};

/** Al administrador, según el estado al que llega un pedido. */
export const MAIL_ADMIN_POR_ESTADO: Readonly<Partial<Record<string, string>>> = {
  pagado: 'aviso_admin_pago',
};

/** Mails que no dependen de un cambio de estado. */
export const MAILS = {
  pedidoCreado: { comprador: 'pedido_recibido', admin: 'aviso_admin_pedido_nuevo' },
  alertaDePago: { admin: 'aviso_admin_alerta' },
  consultaCanje: { admin: 'aviso_admin_canje' },
  datosBancarios: { admin: 'aviso_admin_datos_bancarios' },
  arrepentimiento: { comprador: 'arrepentimiento_recibido', admin: 'aviso_admin_arrepentimiento' },
} as const;

export const todosLosEventosDeMail = (): string[] =>
  [
    ...Object.values(MAIL_COMPRADOR_POR_ESTADO),
    ...Object.values(MAIL_ADMIN_POR_ESTADO),
    ...Object.values(MAILS).flatMap((m) => Object.values(m)),
    'enlace_ingreso',
  ].filter((e): e is string => Boolean(e));

/**
 * Mensaje de mail para el outbox. La clave `evento:referencia:destinatario` hace que el mismo
 * hecho genere un solo mail aunque se procese dos veces (FR-040, US4-05).
 */
export function mail(
  evento: string,
  destinatario: 'comprador' | 'admin',
  referencia: string,
  datos: Record<string, unknown>,
  pedidoId: string | null = null,
): NuevoMensaje {
  return {
    clave: `${evento}:${referencia}:${destinatario}`,
    canal: 'mail',
    evento,
    destinatario,
    pedidoId,
    datos,
  };
}

/** Enlaces al panel que van en los avisos al administrador. */
export const enlacesPanel = (urlFrontend: string) => ({
  pedido: (pedidoId: string) => `${urlFrontend}/panel/pedidos/${pedidoId}`,
  canje: () => `${urlFrontend}/panel/canje`,
  arrepentimientos: () => `${urlFrontend}/panel/arrepentimientos`,
});
