import { MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { demo } from '@/lib/demo';
import { BotonCarrito } from './BotonCarrito';
import { Logo } from './marca/Logo';
import { MenuMovil } from './MenuMovil';

const ENLACES: [string, string][] = [
  ['Catálogo', '/baterias'],
  ['Cómo funciona', '/#como-funciona'],
  ['Quiénes somos', '/#historia'],
  ['Contacto', '/#contacto'],
];

/** Encabezado blanco y fijo, con la acción principal siempre a mano. */
export function Encabezado({ whatsappUrl }: { whatsappUrl: string }) {
  const enlaces: [string, string][] = demo().activa ? [...ENLACES, ['Panel', '/panel']] : ENLACES;
  return (
    <header className="encabezado oscuro sticky top-0 z-40 text-blanco">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-6 px-4 md:h-[72px] md:px-12">
        <span className="encabezado-logo flex origin-left">
          <Logo tono="oscuro" />
        </span>
        <nav aria-label="Principal" className="ml-4 hidden gap-6 lg:flex">
          {enlaces.map(([texto, href]) => (
            <Link
              key={href}
              href={href}
              className="rounded-sm text-[17px] font-semibold text-blanco no-underline transition-colors duration-150 hover:text-naranja"
            >
              {texto}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1 md:gap-3">
          <a
            href={whatsappUrl}
            className="hidden items-center gap-2 rounded-sm px-2 text-[17px] font-semibold text-blanco no-underline transition-colors duration-150 hover:text-naranja md:inline-flex"
          >
            <MessageCircle aria-hidden size={22} strokeWidth={2} />
            Consultanos
          </a>
          <Link
            href="/#buscador"
            className="boton boton-rojo hidden !min-h-12 !px-5 !text-[17px] md:inline-flex"
          >
            Buscar mi batería
          </Link>
          <BotonCarrito />
          <MenuMovil enlaces={enlaces} whatsappUrl={whatsappUrl} />
        </div>
      </div>
    </header>
  );
}
