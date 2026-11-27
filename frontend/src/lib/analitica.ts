'use client';

/**
 * Mediciones en Google Analytics 4 y Meta (FR-056). Solo van productos, cantidades e importes:
 * nunca nombre, mail, teléfono, DNI ni dirección (FR-059). Sin los ids configurados no se carga
 * nada y `medir` no hace nada.
 */
export const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID ?? '';
export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? '';

type Item = { id: string; nombre: string; precio: number; cantidad: number };
type Evento = 'view_item' | 'add_to_cart' | 'begin_checkout' | 'purchase';

const META: Record<Evento, string> = {
  view_item: 'ViewContent',
  add_to_cart: 'AddToCart',
  begin_checkout: 'InitiateCheckout',
  purchase: 'Purchase',
};

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

const CLAVE_UTM = 'casa:utm';
const DIAS_UTM = 30;
const CAMPOS_UTM = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];

/** Guarda el origen de campaña de la visita, para que llegue hasta la compra (R-SEO-13). */
export function guardarCampania() {
  try {
    const q = new URLSearchParams(window.location.search);
    const utm = Object.fromEntries(CAMPOS_UTM.flatMap((k) => (q.get(k) ? [[k, q.get(k)]] : [])));
    if (Object.keys(utm).length)
      localStorage.setItem(
        CLAVE_UTM,
        JSON.stringify({ utm, hasta: Date.now() + DIAS_UTM * 864e5 }),
      );
  } catch {
    // Sin almacenamiento: se mide igual, sin origen de campaña.
  }
}

function campania(): Record<string, string> {
  try {
    const g = JSON.parse(localStorage.getItem(CLAVE_UTM) ?? 'null') as {
      utm: Record<string, string>;
      hasta: number;
    } | null;
    return g && g.hasta > Date.now() ? g.utm : {};
  } catch {
    return {};
  }
}

/** Importes en centavos, como los da la API. */
export function medir(evento: Evento, items: Item[], extra: { pedido?: string } = {}) {
  const valor = items.reduce((s, i) => s + i.precio * i.cantidad, 0) / 100;
  const utm = campania();
  window.gtag?.('event', evento, {
    currency: 'ARS',
    value: valor,
    items: items.map((i) => ({
      item_id: i.id,
      item_name: i.nombre,
      price: i.precio / 100,
      quantity: i.cantidad,
    })),
    ...(extra.pedido ? { transaction_id: extra.pedido } : {}),
    ...utm,
  });
  window.fbq?.(
    'track',
    META[evento],
    {
      currency: 'ARS',
      value: valor,
      content_type: 'product',
      content_ids: items.map((i) => i.id),
      ...utm,
    },
    extra.pedido ? { eventID: `pedido-${extra.pedido}` } : undefined,
  );
}
