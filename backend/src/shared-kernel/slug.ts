/** "Gol Trend" → "gol-trend"; "Edna Reforzada 12x110" → "edna-reforzada-12x110". */
export function slug(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** "clio-mio" → "Clio Mio": para mensajes cuando no hay nombre cargado. */
export function desdeSlug(texto: string): string {
  return texto
    .split('-')
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}
