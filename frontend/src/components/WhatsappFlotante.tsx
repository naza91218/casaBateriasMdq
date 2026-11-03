'use client';

import { MessageCircle } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

/**
 * Botón flotante de WhatsApp. En el celular se corre mientras se ve el buscador, para no tapar
 * los selectores (el buscador ya tiene su propio enlace a WhatsApp). En el checkout no va
 * (FR-052): tapa los botones de pago.
 */
export function WhatsappFlotante({ url }: { url: string }) {
  const ruta = usePathname();
  const [oculto, setOculto] = useState(false);

  useEffect(() => {
    const buscador = document.getElementById('buscador');
    if (!buscador) return;
    const celular = window.matchMedia('(width < 53.75rem)');
    let visible = false;
    const actualizar = () => setOculto(celular.matches && visible);
    const obs = new IntersectionObserver(([e]) => {
      visible = Boolean(e?.isIntersecting);
      actualizar();
    });
    obs.observe(buscador);
    celular.addEventListener('change', actualizar);
    return () => {
      obs.disconnect();
      celular.removeEventListener('change', actualizar);
    };
  }, [ruta]);

  if (ruta.startsWith('/carrito')) return null;
  return (
    <a
      href={url}
      aria-label="Escribinos por WhatsApp"
      inert={oculto}
      className={`fixed right-4 bottom-4 z-30 grid size-16 place-items-center rounded-full bg-whatsapp text-negro transition-[translate,opacity] duration-300 ease-marca hover:-translate-y-0.5 md:right-6 md:bottom-6 ${oculto ? 'pointer-events-none translate-y-24 opacity-0' : ''}`}
    >
      <MessageCircle aria-hidden size={30} strokeWidth={2} />
    </a>
  );
}
