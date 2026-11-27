import { render, toPlainText } from '@react-email/render';
import type { ReactElement } from 'react';
import type { MensajeMail } from '../../../shared-kernel/puertos.js';
import { plantillasAdmin } from './admin.js';
import { plantillasLegales } from './legales.js';
import { plantillasPedidos } from './pedidos.js';

export type Contenido = Omit<MensajeMail, 'para'>;
export type Plantilla = (datos: Record<string, unknown>) => {
  asunto: string;
  cuerpo: ReactElement;
};

/**
 * Registro de plantillas por evento, todas sobre el diseño común de `layout.tsx` (T117).
 * Ninguna plantilla recibe ni muestra el DNI (FR-038).
 */
const plantillas: Record<string, Plantilla> = {
  ...plantillasPedidos,
  ...plantillasAdmin,
  ...plantillasLegales,
};

export const eventosConPlantilla = (): string[] => Object.keys(plantillas);

/** HTML para el cliente de correo y versión en texto (mejora la entrega y evita el spam). */
export async function renderizar(
  evento: string,
  datos: Record<string, unknown>,
): Promise<Contenido> {
  const plantilla = plantillas[evento];
  if (!plantilla) throw new Error(`No hay plantilla para el evento "${evento}"`);
  const { asunto, cuerpo } = plantilla(datos);
  const html = await render(cuerpo);
  return { asunto, html, texto: toPlainText(html) };
}
