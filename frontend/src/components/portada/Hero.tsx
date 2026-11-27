import { BadgeCheck, Gauge, MessageCircle, Truck } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import { Palabras } from '@/components/Palabras';

const INSIGNIAS = [
  { icono: Truck, texto: 'Colocación incluida' },
  { icono: Gauge, texto: 'Medimos el alternador' },
  { icono: BadgeCheck, texto: 'Garantía en todas' },
];

/** Retraso de la animación de entrada (ver .entra en globals.css). */
const demora = (s: number) => ({ '--d': `${s}s` }) as CSSProperties;

/**
 * Hero: dice qué se compra y qué se recibe, con las baterías reales bajo un foco, apoyadas en la
 * losa de la marca. El buscador se monta sobre el borde inferior (ver la portada).
 */
export function Hero({ whatsappUrl }: { whatsappUrl: string }) {
  return (
    <section aria-labelledby="hero-titulo" className="oscuro rayos-fundido hero-foco text-blanco">
      <div className="mx-auto grid max-w-[1200px] items-center gap-10 px-4 pt-12 pb-32 md:grid-cols-[1.25fr_1fr] md:gap-12 md:px-12 md:pt-16 md:pb-40">
        <div>
          <h1 id="hero-titulo" className="al-cargar titular text-[48px] md:text-[84px]">
            <Palabras texto="La batería de tu auto," />{' '}
            <Palabras texto="colocada en tu casa" desde={5} className="text-naranja" />
          </h1>
          <p
            style={demora(0.12)}
            className="entra-suave mt-5 max-w-[38ch] text-[19px] leading-relaxed text-gris-300 md:mt-6 md:text-[21px]"
          >
            Buscala por marca, modelo y año. Vamos con la camioneta, la colocamos y medimos el
            alternador. Hace 45 años en Mar del Plata.
          </p>
          <div
            style={demora(0.24)}
            className="entra-suave mt-7 flex flex-col gap-3 md:mt-9 md:flex-row"
          >
            <Link href="/#buscador" className="boton boton-naranja boton-carga" data-listo="true">
              Buscar mi batería
            </Link>
            <a href={whatsappUrl} className="boton boton-fantasma">
              <MessageCircle aria-hidden size={22} strokeWidth={2} />
              Escribinos por WhatsApp
            </a>
          </div>
          <ul style={demora(0.36)} className="entra-suave mt-8 flex flex-wrap gap-2 md:mt-10">
            {INSIGNIAS.map(({ icono: Icono, texto }) => (
              <li key={texto} className="insignia !gap-2 !px-3.5 !py-2.5">
                <Icono aria-hidden size={19} strokeWidth={2} className="flex-none text-plomo" />
                <span className="text-[15px] font-bold">{texto}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Las baterías reales del local, bajo un foco y sobre la losa de la marca. */}
        <div className="vitrina relative mx-auto aspect-[5/4] w-full max-w-[580px]">
          <div
            aria-hidden
            style={demora(0.1)}
            className="losa entra-losa absolute inset-x-[8%] top-[10%] bottom-[8%] bg-campo shadow-[0_40px_70px_-30px_rgb(0_0_0/0.8)]"
          />
          <Image
            src="/baterias/edna.webp"
            alt="Batería Edna"
            width={777}
            height={732}
            sizes="(width >= 860px) 360px, 60vw"
            style={{ '--f': '-3s' } as CSSProperties}
            className="flota absolute top-[2%] right-0 w-[62%]"
          />
          <Image
            src="/baterias/sermat-12x65.webp"
            alt="Batería Sermat 12x65"
            width={656}
            height={621}
            preload
            sizes="(width >= 860px) 380px, 66vw"
            className="flota absolute bottom-[4%] left-0 w-[66%]"
          />
          <p
            style={demora(0.5)}
            className="losa entra-losa absolute -bottom-3 left-[4%] bg-blanco px-4 py-2 text-negro shadow-[0_14px_24px_-12px_rgb(0_0_0/0.7)]"
          >
            <span className="titular block text-[22px] italic md:text-[28px]">
              45 años <span className="text-rojo-texto">cargando confianza</span>
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}
