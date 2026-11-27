import { z } from 'zod';
import { normalizarMedida, PATRON_MEDIDA } from '../medidas.ts';
import { Importe, Paginacion, paginado, Whatsapp } from './comunes.ts';

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
  garantiaMeses: z.number().int(),
  precios: Precios,
  foto: z.string().nullable(),
  disponible: z.boolean(),
});
export type ItemProducto = z.infer<typeof ItemProducto>;

export const ListadoProductos = paginado(ItemProducto);
export type ListadoProductos = z.infer<typeof ListadoProductos>;

/** Orden del catálogo. "relevantes" (por defecto): por medida y gama, como se busca en el local. */
export const OrdenCatalogo = z.enum([
  'relevantes',
  'precio-asc',
  'precio-desc',
  'amperaje',
  'nombre',
]);
export type OrdenCatalogo = z.infer<typeof OrdenCatalogo>;

export const FiltrosCatalogo = Paginacion.extend({
  marca: z.string().optional(),
  medida: z
    .string()
    .transform(normalizarMedida)
    .pipe(z.string().regex(PATRON_MEDIDA, 'La medida tiene el formato 12x65 o 12x90 alta'))
    .optional(),
  gama: Gama.optional(),
  orden: OrdenCatalogo.optional(),
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
      /** null = todos los años (clarify 2026-10-30). */
      anioDesde: z.number().int().nullable(),
      anioHasta: z.number().int().nullable(),
    }),
  ),
  whatsapp: Whatsapp,
});
export type FichaProducto = z.infer<typeof FichaProducto>;
