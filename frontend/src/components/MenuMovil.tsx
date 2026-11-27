'use client';

import { Menu, MessageCircle, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useId, useState } from 'react';

/** Menú del celular y la tablet: un botón de 48 px que despliega los enlaces. */
export function MenuMovil({
  enlaces,
  whatsappUrl,
}: {
  enlaces: [string, string][];
  whatsappUrl: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const id = useId();

  useEffect(() => {
    if (!abierto) return;
    const cerrar = (e: KeyboardEvent) => e.key === 'Escape' && setAbierto(false);
    window.addEventListener('keydown', cerrar);
    return () => window.removeEventListener('keydown', cerrar);
  }, [abierto]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-expanded={abierto}
        aria-controls={id}
        aria-label={abierto ? 'Cerrar el menú' : 'Abrir el menú'}
        onClick={() => setAbierto((a) => !a)}
        className="grid size-12 place-items-center rounded-sm text-current transition-colors duration-150 hover:bg-white/10"
      >
        {abierto ? <X aria-hidden size={26} /> : <Menu aria-hidden size={26} />}
      </button>
      <nav
        id={id}
        aria-label="Principal"
        hidden={!abierto}
        className="absolute inset-x-0 top-full border-b border-gris-200 bg-blanco px-4 pt-1 pb-6 text-negro"
      >
        <ul>
          {enlaces.map(([texto, href]) => (
            <li key={href} className="border-b border-gris-200">
              <Link
                href={href}
                onClick={() => setAbierto(false)}
                className="flex min-h-14 items-center text-[19px] font-semibold text-negro no-underline"
              >
                {texto}
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-5 grid gap-3">
          <Link
            href="/#buscador"
            onClick={() => setAbierto(false)}
            className="boton boton-rojo w-full"
          >
            Buscar mi batería
          </Link>
          <a href={whatsappUrl} className="boton boton-borde w-full">
            <MessageCircle aria-hidden size={22} />
            Consultanos por WhatsApp
          </a>
        </div>
      </nav>
    </div>
  );
}
