import { cache } from 'react';
import { api, enlaceWhatsapp, intentar } from './api';

export type DatosTienda = {
  whatsapp: string;
  descuentoPct: number | null;
  domicilio: string;
  horarios: string[];
  telefono: string | null;
  razonSocial: string | null;
  cuit: string | null;
};

/**
 * Datos del comercio que muestran el encabezado, la portada y el pie. Si la API no responde
 * se ven los marcadores entre corchetes, igual que en el prototipo: nunca se inventan datos.
 */
export const datosTienda = cache(async (): Promise<DatosTienda> => {
  const c = await intentar(api.configuracion());
  return {
    whatsapp: c?.whatsapp ?? '',
    descuentoPct: c?.descuentoPct ?? null,
    domicilio: c?.comercio.domicilio || 'Av. Juan B. Justo 5766, Mar del Plata',
    horarios: c?.horarios.map((h) => `${h.dias} de ${h.desde} a ${h.hasta}`) ?? [],
    telefono: c?.comercio.telefono || null,
    razonSocial: c?.comercio.razonSocial || null,
    cuit: c?.comercio.cuit || null,
  };
});

export const MENSAJE_CONSULTA = 'Hola, quiero consultar por una batería para mi auto.';

export function whatsappDe(d: DatosTienda, mensaje = MENSAJE_CONSULTA): string {
  return enlaceWhatsapp(d.whatsapp, mensaje);
}
