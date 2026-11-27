'use client';

import { usePathname } from 'next/navigation';
import Script from 'next/script';
import { useEffect, useRef } from 'react';
import { GA4_ID, guardarCampania, META_PIXEL_ID, medir } from '@/lib/analitica';

/** Carga GA4 y el píxel de Meta solo si están configurados, y cuenta cada cambio de página. */
export function Analitica() {
  const ruta = usePathname();
  const primera = useRef(true);

  useEffect(() => {
    guardarCampania();
    // La primera vista la cuentan los propios scripts al cargar.
    if (primera.current) {
      primera.current = false;
      return;
    }
    window.fbq?.('track', 'PageView');
  }, [ruta]);

  return (
    <>
      {GA4_ID && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`} />
          <Script id="ga4">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=gtag;gtag('js',new Date());gtag('config',${JSON.stringify(GA4_ID)});`}
          </Script>
        </>
      )}
      {META_PIXEL_ID && (
        <Script id="meta-pixel">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init',${JSON.stringify(META_PIXEL_ID)});fbq('track','PageView');`}
        </Script>
      )}
    </>
  );
}

/** Para las páginas del servidor: mide un evento una sola vez al mostrarse. */
export function Medir({
  evento,
  items,
  pedido,
}: {
  evento: 'view_item' | 'purchase';
  items: Parameters<typeof medir>[1];
  pedido?: string;
}) {
  useEffect(() => {
    if (pedido) {
      // La compra se cuenta una vez por pedido, aunque recargue el seguimiento.
      const clave = `casa:medido:${pedido}`;
      try {
        if (localStorage.getItem(clave)) return;
        localStorage.setItem(clave, '1');
      } catch {
        // Sin almacenamiento: puede contarse de nuevo si recarga; Meta lo deduplica por eventID.
      }
    }
    medir(evento, items, pedido ? { pedido } : {});
  }, [evento, items, pedido]);
  return null;
}
