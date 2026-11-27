import type { IndiceSeo } from '@casa/shared';
import { intentar, pedir } from './api';

/** Productos activos y modelos con compatibilidad (FR-055). Si la API no responde, va vacío. */
export async function indiceSeo(): Promise<IndiceSeo> {
  return (
    (await intentar(
      pedir<IndiceSeo>('/seo/indice', { etiquetas: ['catalogo', 'buscador'], segundos: 3600 }),
    )) ?? { productos: [], modelos: [] }
  );
}

/** Páginas fijas de la tienda que se indexan. */
export const PAGINAS_FIJAS = [
  { ruta: '/', titulo: 'Portada: buscador de baterías por auto' },
  { ruta: '/baterias', titulo: 'Todas las baterías' },
  { ruta: '/quienes-somos', titulo: 'Quiénes somos' },
  { ruta: '/contacto', titulo: 'Contacto, horarios y formas de pago' },
  { ruta: '/legales/terminos', titulo: 'Términos y condiciones' },
  { ruta: '/legales/privacidad', titulo: 'Política de privacidad' },
  { ruta: '/legales/garantia', titulo: 'Cambios y garantía' },
  { ruta: '/arrepentimiento', titulo: 'Botón de arrepentimiento' },
];

/** Lo que nunca se indexa (FR-055, FR-074). */
export const PRIVADAS = ['/panel', '/carrito', '/pedido', '/buscar', '/api'];
