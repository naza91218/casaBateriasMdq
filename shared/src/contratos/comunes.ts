import { z } from 'zod';

/** Importe en centavos enteros (nunca decimales). */
export const Importe = z.number().int().nonnegative();

/** Cuerpo de todo error de la API (contracts/api-rest.md). */
export const ErrorRespuesta = z.object({
  error: z.object({
    codigo: z.string(),
    mensaje: z.string(),
    campos: z.record(z.string(), z.string()).optional(),
  }),
});
export type ErrorRespuesta = z.infer<typeof ErrorRespuesta>;

export const Paginacion = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce.number().int().min(1).max(100).default(24),
});

export const paginado = <T extends z.ZodType>(item: T) =>
  z.object({
    items: z.array(item),
    total: z.number().int(),
    pagina: z.number().int(),
    porPagina: z.number().int(),
  });

/** Salida a WhatsApp con el contexto ya escrito (constitución III). */
export const Whatsapp = z.object({ url: z.string().url(), mensaje: z.string() });
export type Whatsapp = z.infer<typeof Whatsapp>;
