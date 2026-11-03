import type { MetadataRoute } from 'next';
import { indiceSeo, PAGINAS_FIJAS } from '@/lib/seo';
import { SITIO } from '@/lib/sitio';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { productos, modelos } = await indiceSeo();
  return [
    ...PAGINAS_FIJAS.map((p) => ({ url: `${SITIO}${p.ruta === '/' ? '' : p.ruta}` })),
    ...productos.map((p) => ({
      url: `${SITIO}/producto/${p.slug}`,
      lastModified: p.actualizadoEn,
    })),
    ...modelos.map((m) => ({
      url: `${SITIO}/auto/${m.marca.slug}/${m.modelo.slug}`,
      lastModified: m.actualizadoEn,
    })),
  ];
}
