/**
 * Demo para el cliente (infra/demo): la tienda muestra un acceso al panel y el panel, uno a la
 * bandeja de mails de la demo. Fuera de la demo no aparece nada. Las páginas estáticas leen
 * DEMO al compilar; el panel (dinámico) lee la URL de los mails en cada pedido, porque cambia
 * cada vez que se abre el túnel.
 */
export function demo() {
  return {
    activa: process.env.DEMO === '1',
    urlMails: process.env.DEMO_URL_MAILS || null,
    emailAdmin: process.env.DEMO_EMAIL_ADMIN || null,
    /** El panel entra sin enlace por mail (la API tiene DEMO_INGRESO_DIRECTO). */
    ingresoDirecto: Boolean(process.env.DEMO_INGRESO_DIRECTO),
  };
}
