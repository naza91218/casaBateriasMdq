import type { ConfiguracionPublica } from '@casa/shared';
import { NOMBRE, SITIO } from './sitio';

const DIAS: [RegExp, string][] = [
  [/lun/i, 'Mo'],
  [/mar(?!z)/i, 'Tu'],
  [/mi[eé]/i, 'We'],
  [/jue/i, 'Th'],
  [/vie/i, 'Fr'],
  [/s[aá]b/i, 'Sa'],
  [/dom/i, 'Su'],
];

/** "Lunes a viernes" → "Mo-Fr"; "Sábados" → "Sa". Lo que no se entiende queda afuera. */
function dias(texto: string): string | null {
  const hallados = DIAS.map(([re, d]) => ({ d, i: texto.search(re) }))
    .filter((x) => x.i >= 0)
    .sort((a, b) => a.i - b.i)
    .map((x) => x.d);
  if (hallados.length === 0) return null;
  if (hallados.length === 2 && /\sa\s/i.test(texto)) return `${hallados[0]}-${hallados[1]}`;
  return hallados.join(',');
}

/**
 * El comercio para Google y los buscadores con IA (FR-054, FR-073). Nombre, dirección y teléfono
 * salen siempre de la configuración, así son idénticos en todas las páginas.
 */
export function comercioJsonLd(c: ConfiguracionPublica) {
  const tel = c.comercio.telefono || (c.whatsapp ? `+${c.whatsapp}` : undefined);
  return {
    '@context': 'https://schema.org',
    '@type': 'AutoPartsStore',
    '@id': `${SITIO}/#comercio`,
    name: NOMBRE,
    url: SITIO,
    ...(c.comercio.razonSocial ? { legalName: c.comercio.razonSocial } : {}),
    ...(tel ? { telephone: tel } : {}),
    address: {
      '@type': 'PostalAddress',
      streetAddress: c.comercio.domicilio.split(',')[0]?.trim(),
      addressLocality: 'Mar del Plata',
      addressRegion: 'Buenos Aires',
      addressCountry: 'AR',
    },
    ...(c.comercio.lat != null && c.comercio.lng != null
      ? { geo: { '@type': 'GeoCoordinates', latitude: c.comercio.lat, longitude: c.comercio.lng } }
      : {}),
    openingHours: c.horarios.flatMap((h) => {
      const d = dias(h.dias);
      return d ? [`${d} ${h.desde}-${h.hasta}`] : [];
    }),
    areaServed: [
      { '@type': 'City', name: 'Mar del Plata' },
      ...c.zonas.map((z) => ({ '@type': 'Place', name: z.nombre })),
    ],
    ...(c.googleResenasUrl ? { sameAs: [c.googleResenasUrl] } : {}),
  };
}

/** Para un `<script type="application/ld+json">` sin que un texto cargado cierre la etiqueta. */
export const comoJson = (datos: unknown) => JSON.stringify(datos).replace(/</g, '\\u003c');
