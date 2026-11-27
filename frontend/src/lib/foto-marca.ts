/**
 * Foto de la marca para los productos que todavía no tienen foto propia. Es ilustrativa: la
 * página lo aclara, porque la etiqueta de la foto puede mostrar otra medida. Volta no tiene.
 */
const FOTOS: Record<string, string> = {
  sermat: '/baterias/sermat-12x65.webp',
  edna: '/baterias/edna.webp',
  herbo: '/baterias/herbo.webp',
};

export function fotoDeMarca(slugMarca: string): string | null {
  return FOTOS[slugMarca] ?? null;
}
