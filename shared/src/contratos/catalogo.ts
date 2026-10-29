import { z } from 'zod';
import { Importe, Paginacion, paginado, Whatsapp } from './comunes.js';

export const Gama = z.enum(['economica', 'reforzada']);
export type Gama = z.infer<typeof Gama>;

export const MarcaCatalogo = z.object({ nombre: z.string(), slug: z.string() });
export type MarcaCatalogo = z.infer<typeof MarcaCatalogo>;

export const Medida = z.object({ codigo: z.string() });
export type Medida = z.infer<typeof Medida>;

export const Precios = z.object({
  lista: Importe,
  /** Con el descuento por transferencia o efectivo en el local. */
  transferenciaOEfectivo: Importe,
  descuentoPct: z.number(),
});

/** Producto en listados y resultados del buscador. Nunca expone stock, SKU ni estado. */
export const ItemProducto = z.object({
  id: z.string(),
  slug: z.string(),
  nombre: z.string(),
  marca: MarcaCatalogo,
  medida: z.string(),
  gama: Gama,
  amperajeAh: z.number().int(),
  cca: z.number().int().nullable(),
  precios: Precios,
  foto: z.string().nullable(),
  disponible: z.boolean(),
});
export type ItemProducto = z.infer<typeof ItemProducto>;

export const ListadoProductos = paginado(ItemProducto);
export type ListadoProductos = z.infer<typeof ListadoProductos>;

export const FiltrosCatalogo = Paginacion.extend({
  marca: z.string().optional(),
  medida: z.string().regex(/^\d+x\d+$/, 'La medida tiene el formato 12x65').optional(),
  gama: Gama.optional(),
});

export const FichaProducto = ItemProducto.extend({
  descripcion: z.string(),
  fotos: z.array(z.string()),
  explicacionGama: z.string(),
  servicioIncluido: z.array(z.string()),
  autosCompatibles: z.array(
    z.object({
      marca: z.string(),
      modelo: z.string(),
      anioDesde: z.number().int(),
      anioHasta: z.number().int(),
    }),
  ),
  whatsapp: Whatsapp,
});
export type FichaProducto = z.infer<typeof FichaProducto>;
