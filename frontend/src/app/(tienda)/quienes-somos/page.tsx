import { ImageIcon, MessageCircle } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { datosTienda, whatsappDe } from '@/lib/tienda';

export const metadata: Metadata = {
  title: 'Quiénes somos',
  description:
    'Hace 45 años que vendemos y colocamos baterías en Mar del Plata. Conocé el local y al equipo.',
};

/** Historia, equipo y local (FR-051). Los datos de confianza van como texto (FR-075). */
export default async function QuienesSomos() {
  const d = await datosTienda();
  return (
    <>
      <section className="rayos-rojo text-negro">
        <div className="mx-auto max-w-[1200px] px-4 py-14 md:px-12 md:py-20">
          <h1 className="titular text-[52px] md:text-[88px]">
            45 años <span className="text-blanco">en el mercado</span>
          </h1>
          <p className="mt-5 max-w-[52ch] text-[20px] leading-relaxed">
            Vendemos y colocamos baterías en Mar del Plata, en {d.domicilio}. Todas con 12 meses de
            garantía y la colocación incluida.
          </p>
        </div>
      </section>

      <div className="mx-auto grid max-w-[1200px] gap-12 px-4 py-14 md:grid-cols-[1.1fr_1fr] md:px-12 md:py-20">
        <div className="flex flex-col gap-10">
          <section>
            <h2 className="titular text-[34px] md:text-[44px]">Cómo empezó</h2>
            <p className="mt-3 max-w-[60ch] leading-relaxed">
              [Historia del local: el año en que abrió, quién lo fundó y cómo creció. Texto a cargar
              por Juan.]
            </p>
          </section>
          <section>
            <h2 className="titular text-[34px] md:text-[44px]">Quién te atiende</h2>
            <p className="mt-3 max-w-[60ch] leading-relaxed">
              [El equipo de hoy: nombres, qué hace cada uno y desde cuándo está en el local.]
            </p>
          </section>
          <section>
            <h2 className="titular text-[34px] md:text-[44px]">Qué te llevás</h2>
            <ul className="mt-3 flex list-disc flex-col gap-2 pl-6">
              <li>La batería justa para tu auto, por marca, modelo y año.</li>
              <li>Colocación incluida en el local y en Mar del Plata.</li>
              <li>12 meses de garantía en todas las baterías.</li>
              <li>Retiramos la batería usada para reciclarla.</li>
            </ul>
          </section>
          <div className="flex flex-col gap-3 md:flex-row">
            <Link href="/#buscador" className="boton boton-rojo">
              Buscar la batería de mi auto
            </Link>
            <a href={whatsappDe(d)} className="boton boton-borde">
              <MessageCircle aria-hidden size={22} />
              Escribinos
            </a>
          </div>
        </div>
        <figure className="grid aspect-[4/3] place-items-center self-start rounded-md bg-negro text-center text-gris-400">
          <div>
            <ImageIcon aria-hidden size={48} strokeWidth={1.5} className="mx-auto" />
            <figcaption className="mt-3 font-semibold">[Foto del local o del equipo]</figcaption>
          </div>
        </figure>
      </div>
    </>
  );
}
