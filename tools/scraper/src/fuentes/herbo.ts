import * as cheerio from 'cheerio';
import type { ClienteEducado } from '../cliente.js';
import { altoDe, medida, voltsYAmperes, type FilaProducto } from '../planillas.js';

const SITIO = 'https://www.herbobaterias.com';

export interface ProductoHerbo {
  url: string;
  slug: string;
  nombre: string;
  linea: string;
  volts: number | null;
  cca: number | null;
  reservaMin: number | null;
  dimensiones: string;
  foto: string | null;
  autos: string[];
  etiquetas: string[];
}

/** Lee una ficha de Herbo. Usa los metadatos (og:*) y las listas de categorías y etiquetas. */
export function leerFicha(html: string, url: string): ProductoHerbo {
  const $ = cheerio.load(html);
  const meta = (p: string) => $(`meta[property="${p}"]`).attr('content')?.trim() ?? '';
  const nombre = meta('og:title')
    .replace(/\s*-\s*Herbo Bater[ií]as\s*$/i, '')
    .trim();
  // "Dimensiones:204 X 174 X 190 mm > Línea Evolution12V 400CA 60min RC"
  const desc = meta('og:description');
  const electrico = desc.match(/(\d+)\s*V\s*(\d+)\s*CA(?:\s*(\d+)\s*min)?/i);
  const lista = (selector: string) =>
    $(selector)
      .map((_, a) => $(a).text().trim())
      .get()
      .filter(Boolean);
  return {
    url,
    slug: url.replace(/\/$/, '').split('/').pop() ?? '',
    nombre,
    linea: desc.match(/L[ií]nea\s+(.+?)(?=\d+\s*V\b|$)/i)?.[1]?.trim() ?? '',
    volts: electrico ? Number(electrico[1]) : null,
    cca: electrico ? Number(electrico[2]) : null,
    reservaMin: electrico?.[3] ? Number(electrico[3]) : null,
    dimensiones:
      desc
        .match(/Dimensiones:\s*([\d\sxX.,]+mm)/i)?.[1]
        ?.replace(/\s*[xX]\s*/g, ' x ')
        .trim() ?? '',
    foto: meta('og:image') || null,
    autos: lista('.posted_in a'),
    etiquetas: lista('.tagged_as a'),
  };
}

/** Solo baterías de arranque de 12 V para autos, camionetas y camiones: el rubro del negocio. */
export function esDelRubro(p: ProductoHerbo): boolean {
  if (p.volts !== 12) return false;
  return p.etiquetas.some((e) => /^autos$/i.test(e)) || /servicio pesado/i.test(p.linea);
}

/**
 * Amperaje: del nombre ("Platinum 12 80", "Fit 12 55") o, si no está, del código de la URL
 * ("evolution-60"). Si no aparece en ningún lado queda vacío para que lo complete Juan.
 */
export function amperajeDe(p: ProductoHerbo): number | null {
  const delNombre = voltsYAmperes(p.nombre);
  if (delNombre) return delNombre.ah;
  const delSlug = p.slug.match(/-(\d{2,3})$/);
  return delSlug ? Number(delSlug[1]) : null;
}

export function aFila(p: ProductoHerbo, rutaFoto: string | null): FilaProducto {
  const ah = amperajeDe(p);
  const partes = [
    p.linea ? `Línea ${p.linea}.` : '',
    p.cca ? `${p.cca} A de arranque en frío (CCA).` : '',
    p.reservaMin ? `Reserva de ${p.reservaMin} minutos.` : '',
    p.dimensiones ? `Medidas: ${p.dimensiones}.` : '',
  ];
  return {
    sku: `HERBO-${p.slug.toUpperCase()}`,
    marca: 'Herbo',
    nombre: `Herbo ${p.nombre}`,
    medida: ah ? medida(12, ah, altoDe(p.dimensiones)) : '',
    amperaje_ah: ah ? String(ah) : '',
    cca: p.cca ? String(p.cca) : '',
    // Suposición inicial: las líneas premium como reforzadas. Juan la confirma al revisar.
    gama: /platinum|premium|max|servicio pesado/i.test(`${p.nombre} ${p.linea}`)
      ? 'reforzada'
      : 'economica',
    descripcion: partes.filter(Boolean).join(' '),
    precio_lista: '',
    stock: '',
    fotos: rutaFoto ?? '',
    fuente: p.url,
  };
}

/** URLs de todas las fichas, desde el mapa del sitio. */
export async function urlsDeFichas(cliente: ClienteEducado): Promise<string[]> {
  const xml = await cliente.texto(`${SITIO}/product-sitemap.xml`);
  const $ = cheerio.load(xml, { xml: true });
  return $('loc')
    .map((_, l) => $(l).text().trim())
    .get()
    .filter((u) => u.includes('/producto/'));
}
