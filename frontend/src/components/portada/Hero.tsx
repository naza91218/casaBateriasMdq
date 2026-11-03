import { Check, MessageCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

const CONFIANZA = ['Colocación incluida', '12 meses de garantía', 'Marcas nacionales'];

/**
 * Hero: dice qué se compra y qué se recibe, muestra las baterías reales y deja la acción
 * principal a la vista (patrón "Hero-Centric" de ui-ux-pro-max). El buscador va debajo.
 */
export function Hero({ whatsappUrl }: { whatsappUrl: string }) {
  return (
    <section
      aria-labelledby="hero-titulo"
      className="oscuro rayos-negro overflow-hidden text-blanco"
    >
      <div className="mx-auto grid max-w-[1200px] items-center gap-10 px-4 pt-10 pb-12 md:grid-cols-[1.08fr_1fr] md:gap-12 md:px-12 md:py-14">
        <div>
          <h1 id="hero-titulo" className="titular text-[46px] md:text-[72px]">
            La batería de tu auto, <span className="text-naranja">colocada en tu casa</span>
          </h1>
          <p className="mt-5 max-w-[36ch] text-[19px] leading-relaxed text-gris-300 md:mt-6 md:text-[21px]">
            Buscala por marca, modelo y año. Vamos con la camioneta, la colocamos y medimos el
            alternador. Hace 45 años en Mar del Plata.
          </p>
          <div className="mt-7 flex flex-col gap-3 md:mt-8 md:flex-row">
            <Link href="/#buscador" className="boton boton-rojo">
              Buscar mi batería
            </Link>
            <a href={whatsappUrl} className="boton boton-fantasma">
              <MessageCircle aria-hidden size={22} strokeWidth={2} />
              Escribinos por WhatsApp
            </a>
          </div>
          <ul className="mt-8 flex flex-col gap-2.5 md:mt-9">
            {CONFIANZA.map((t) => (
              <li key={t} className="flex items-center gap-2.5 text-[17px] font-semibold">
                <span className="grid size-6 flex-none place-items-center rounded-sm bg-naranja text-negro">
                  <Check aria-hidden size={17} strokeWidth={3} />
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>

        {/* Las baterías reales del local sobre la losa de la marca. */}
        <div className="relative mx-auto aspect-[5/4] w-full max-w-[560px]">
          <div aria-hidden className="losa absolute inset-x-[8%] top-[10%] bottom-[6%] bg-campo" />
          <Image
            src="/baterias/edna.webp"
            alt="Batería Edna"
            width={777}
            height={732}
            sizes="(width >= 860px) 360px, 60vw"
            className="absolute top-[2%] right-0 w-[62%]"
          />
          <Image
            src="/baterias/sermat-12x65.webp"
            alt="Batería Sermat 12x65"
            width={656}
            height={621}
            preload
            sizes="(width >= 860px) 380px, 66vw"
            className="absolute bottom-0 left-0 w-[66%]"
          />
          <p className="losa absolute -bottom-3 left-[4%] bg-blanco px-4 py-2 text-negro">
            <span className="titular block text-[22px] italic md:text-[28px]">
              45 años <span className="text-rojo-texto">cargando confianza</span>
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}
