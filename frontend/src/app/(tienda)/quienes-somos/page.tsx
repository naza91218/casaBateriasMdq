import { MessageCircle } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Palabras } from '@/components/Palabras';
import { FotosLocal } from '@/components/FotosLocal';
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
          <h1 className="al-cargar titular text-[52px] md:text-[88px]">
            <Palabras texto="45 años" />{' '}
            <Palabras texto="en el mercado" desde={2} className="text-blanco" />
          </h1>
          <p className="mt-5 max-w-[52ch] text-[20px] leading-relaxed">
            Vendemos y colocamos baterías en Mar del Plata, en {d.domicilio}. Todas con garantía, de
            12 o 18 meses, y la colocación incluida.
          </p>
        </div>
      </section>

      <div className="mx-auto grid max-w-[1200px] gap-12 px-4 py-14 md:grid-cols-[1.1fr_1fr] md:px-12 md:py-20">
        <div className="flex flex-col gap-10">
          <section>
            <h2 className="titular text-[34px] md:text-[44px]">Cómo empezó</h2>
            <p className="mt-3 max-w-[60ch] leading-relaxed">
              [Historia del local: el año en que abrió, quién lo fundó y cómo creció. Texto a cargar
              por Mateo.]
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
              <li>Garantía en todas: hasta 18 meses, según la marca y la medida.</li>
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
        <FotosLocal className="self-start" />
      </div>
    </>
  );
}
