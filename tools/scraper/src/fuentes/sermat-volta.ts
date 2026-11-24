import * as cheerio from 'cheerio';
import { medida, voltsYAmperes, type FilaProducto } from '../planillas.js';

export const URL_SERMAT_VOLTA = 'https://www.bateriaspeiro.com.ar/sermat.html';

export interface ModeloLista {
  marca: 'Sermat' | 'Volta';
  linea: string;
  codigo: string;
  tipo: string;
  aplicaciones: string;
}

/**
 * Lista pública de un distribuidor con los modelos de Sermat y Volta (Volta es la segunda marca
 * de Sermat). Cada tabla va después de un título "BATERÍAS SERMAT"/"BATERÍAS VOLTA" y uno de
 * línea. La columna de precio se ignora: los precios los pone el negocio.
 */
export function leerLista(html: string): ModeloLista[] {
  const $ = cheerio.load(html);
  const modelos: ModeloLista[] = [];
  let marca: ModeloLista['marca'] | null = null;
  let linea = '';
  $('h1, h2, h3, h4, h5, h6, table').each((_, el) => {
    if (el.tagName !== 'table') {
      const titulo = $(el).text().trim();
      if (/bater[ií]as\s+sermat/i.test(titulo)) marca = 'Sermat';
      else if (/bater[ií]as\s+volta/i.test(titulo)) marca = 'Volta';
      else if (/l[ií]nea/i.test(titulo)) linea = titulo.replace(/^l[ií]nea\s+/i, '');
      return;
    }
    if (!marca) return;
    const encabezados = $(el)
      .find('tr')
      .first()
      .find('th, td')
      .map((_, c) => $(c).text().trim().toLowerCase())
      .get();
    const col = (nombre: RegExp) => encabezados.findIndex((h) => nombre.test(h));
    const [iCodigo, iTipo, iAplic] = [col(/c[oó]digo/), col(/tipo/), col(/aplicaci/)];
    if (iCodigo < 0 || iTipo < 0) return;
    $(el)
      .find('tr')
      .slice(1)
      .each((_, tr) => {
        const celdas = $(tr)
          .find('td, th')
          .map((_, c) => $(c).text().replace(/\s+/g, ' ').trim())
          .get();
        const codigo = celdas[iCodigo] ?? '';
        if (!codigo || !marca) return;
        modelos.push({
          marca,
          linea,
          codigo,
          tipo: celdas[iTipo] ?? '',
          aplicaciones: iAplic >= 0 ? (celdas[iAplic] ?? '') : '',
        });
      });
  });
  return modelos;
}

/** "12V90AMP ALTA" → 90 Ah; "180AMP" → 180 Ah (12 V: las de 6 V dicen 6V). */
export function amperajeDe(tipo: string): number | null {
  const conVolts = voltsYAmperes(tipo);
  if (conVolts) return conVolts.volts === 12 ? conVolts.ah : null;
  const solo = tipo.match(/(\d{2,3})\s*amp/i);
  return solo ? Number(solo[1]) : null;
}

export function aFila(m: ModeloLista): FilaProducto {
  const ah = amperajeDe(m.tipo);
  const borne = /\balta\b/i.test(m.tipo)
    ? 'Borne alto.'
    : /\bbaja\b/i.test(m.tipo)
      ? 'Borne bajo.'
      : '';
  return {
    sku: `${m.marca.toUpperCase()}-${m.codigo.toUpperCase().replace(/[^A-Z0-9]+/g, '-')}`,
    marca: m.marca,
    nombre: `${m.marca} ${m.codigo}`,
    medida: ah ? medida(12, ah) : '',
    amperaje_ah: ah ? String(ah) : '',
    cca: '',
    // Suposición inicial: la línea pesada como reforzada. Mateo la confirma al revisar.
    gama: /pesada/i.test(m.linea) ? 'reforzada' : 'economica',
    descripcion: [m.linea ? `Línea ${m.linea}.` : '', `${ah ? `12 V ${ah} Ah.` : ''}`, borne]
      .filter(Boolean)
      .join(' '),
    precio_lista: '',
    stock: '',
    fotos: '',
    fuente: URL_SERMAT_VOLTA,
  };
}
