import type { MensajeMail } from '../../../shared-kernel/puertos.js';
import { plantillasPedidos } from './pedidos.js';

export type Contenido = Omit<MensajeMail, 'para'>;
type Plantilla = (datos: Record<string, unknown>) => Contenido;

const escapar = (v: unknown) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/**
 * Registro de plantillas por evento. Las de pedidos se suman en T086/T095 y el diseño común
 * (React Email) en T117. Ninguna plantilla recibe ni muestra el DNI (FR-038).
 */
const plantillas: Record<string, Plantilla> = {
  ...plantillasPedidos,
  enlace_ingreso: (d) => ({
    asunto: 'Tu enlace para entrar al panel',
    texto: `Entrá al panel con este enlace (vence en 15 minutos y sirve una sola vez):\n${String(d.url)}\n\nSi no lo pediste, ignorá este mail.`,
    html: `<p>Entrá al panel con este enlace. Vence en 15 minutos y sirve una sola vez.</p><p><a href="${escapar(d.url)}">Entrar al panel</a></p><p>Si no lo pediste, ignorá este mail.</p>`,
  }),
};

export function registrarPlantilla(evento: string, plantilla: Plantilla): void {
  plantillas[evento] = plantilla;
}

export function renderizar(evento: string, datos: Record<string, unknown>): Contenido {
  const plantilla = plantillas[evento];
  if (!plantilla) throw new Error(`No hay plantilla para el evento "${evento}"`);
  return plantilla(datos);
}
