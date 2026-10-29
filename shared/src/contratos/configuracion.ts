import { z } from 'zod';
import { Importe } from './comunes.js';

export const ConfiguracionPublica = z.object({
  descuentoPct: z.number(),
  whatsapp: z.string(),
  horarios: z.array(z.object({ dias: z.string(), desde: z.string(), hasta: z.string() })),
  comercio: z.object({
    razonSocial: z.string(),
    cuit: z.string(),
    domicilio: z.string(),
    telefono: z.string(),
    lat: z.number().nullable(),
    lng: z.number().nullable(),
  }),
  zonas: z.array(z.object({ id: z.string(), nombre: z.string(), costoExtra: Importe })),
  googleResenasUrl: z.string(),
});
export type ConfiguracionPublica = z.infer<typeof ConfiguracionPublica>;
