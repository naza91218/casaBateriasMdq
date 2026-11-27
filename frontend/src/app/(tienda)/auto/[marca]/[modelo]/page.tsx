import type { PaginaVehiculo } from '@casa/shared';
import { MessageCircle, RotateCcw } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { TarjetaProducto } from '@/components/catalogo/TarjetaProducto';
import { ErrorApi, pedir } from '@/lib/api';
import { comoJson } from '@/lib/datos-estructurados';
import { enLista } from '@/lib/formato';
import { SITIO } from '@/lib/sitio';
import { datosTienda, etiquetaAuto } from '@/lib/tienda';

const GAMAS = {
  economica: { titulo: 'Económicas', bajada: 'Para el uso de todos los días.' },
  reforzada: { titulo: 'Reforzadas', bajada: 'Para exigirle más: frío, viajes y muchos consumos.' },
} as const;

const pagina = cache(async (marca: string, modelo: string): Promise<PaginaVehiculo | null> => {
  try {
    return await pedir<PaginaVehiculo>(
      `/vehiculos/${encodeURIComponent(marca)}/${encodeURIComponent(modelo)}`,
      { etiquetas: ['buscador', 'catalogo', etiquetaAuto(marca, modelo)] },
    );
  } catch (e) {
    if (e instanceof ErrorApi && e.estado < 500) return null;
    throw e;
  }
});

type Props = { params: Promise<{ marca: string; modelo: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { marca, modelo } = await params;
  const p = await pagina(marca, modelo);
  if (!p) return { title: 'Auto no encontrado' };
  const auto = `${p.marca.nombre} ${p.modelo.nombre}`;
  return {
    title: `¿Qué batería lleva el ${auto}? ${enLista(p.medidas)}`.trim(),
    description: `${p.respuesta} Te la colocamos en Mar del Plata, con hasta 18 meses de garantía.`,
    alternates: { canonical: `/auto/${p.marca.slug}/${p.modelo.slug}` },
  };
}

const anios = (desde: number | null, hasta: number | null) =>
  desde ? (desde === hasta ? `${desde}` : `${desde} a ${hasta}`) : 'Todos los años';

/** Página de cada modelo (FR-053, FR-072): responde la medida y se lee sin scripts. */
export default async function PaginaAuto({ params }: Props) {
  const { marca, modelo } = await params;
  const [p, datos] = await Promise.all([pagina(marca, modelo), datosTienda()]);
  if (!p) notFound();
  const auto = `${p.marca.nombre} ${p.modelo.nombre}`;
  const url = `${SITIO}/auto/${p.marca.slug}/${p.modelo.slug}`;

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: p.preguntas.map((q) => ({
        '@type': 'Question',
        name: q.pregunta,
        acceptedAnswer: { '@type': 'Answer', text: q.respuesta },
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITIO },
        { '@type': 'ListItem', position: 2, name: auto, item: url },
      ],
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: comoJson(jsonLd) }} />
      <section aria-labelledby="auto-titulo" className="bg-gris-100">
        <div className="mx-auto max-w-[1200px] px-4 py-10 md:px-12 md:py-14">
          <p className="font-semibold text-gris-600">Baterías para {auto}</p>
          <h1 id="auto-titulo" className="titular mt-1 text-[44px] md:text-[64px]">
            ¿Qué batería lleva el {auto}?
          </h1>
          <p className="mt-3 max-w-[60ch] text-[20px] md:text-[22px]">{p.respuesta}</p>
          <Link
            href="/#buscador"
            className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-sm font-semibold text-rojo-texto underline hover:text-negro"
          >
            <RotateCcw aria-hidden size={20} />
            Buscar otro auto
          </Link>
        </div>
      </section>

      <div className="mx-auto max-w-[1200px] px-4 py-12 md:px-12 md:py-16">
        {p.tabla.length > 0 && (
          <section aria-labelledby="tabla-titulo" className="mb-14">
            <h2 id="tabla-titulo" className="titular text-[34px] md:text-[44px]">
              Medida por año y motor
            </h2>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[480px] border-collapse text-left">
                <thead>
                  <tr className="border-b-2 border-negro">
                    <th scope="col" className="py-3 pr-4 font-bold">
                      Años
                    </th>
                    <th scope="col" className="py-3 pr-4 font-bold">
                      Motor
                    </th>
                    <th scope="col" className="py-3 font-bold">
                      Batería
                    </th>
                  </tr>
                </thead>
                <tbody className="num">
                  {p.tabla.map((f, i) => (
                    <tr key={i} className="border-b border-gris-200">
                      <td className="py-3 pr-4">{anios(f.anioDesde, f.anioHasta)}</td>
                      <td className="py-3 pr-4">{f.motor ?? 'Todos'}</td>
                      <td className="py-3 font-bold">{enLista(f.medidas)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {p.grupos.map((g) => (
          <section key={g.gama} aria-labelledby={`gama-${g.gama}`} className="mb-14">
            <h2 id={`gama-${g.gama}`} className="titular text-[34px] md:text-[44px]">
              {GAMAS[g.gama].titulo}
            </h2>
            <p className="mt-1 text-gris-600">{GAMAS[g.gama].bajada}</p>
            <ul className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {g.productos.map((prod) => (
                <li key={prod.id} className="flex">
                  <TarjetaProducto p={prod} whatsapp={datos.whatsapp} />
                </li>
              ))}
            </ul>
          </section>
        ))}

        {p.preguntas.length > 0 && (
          <section aria-labelledby="faq-titulo" className="mb-14 max-w-[760px]">
            <h2 id="faq-titulo" className="titular text-[34px] md:text-[44px]">
              Preguntas frecuentes
            </h2>
            <div className="mt-4 divide-y divide-gris-200 border-y border-gris-200">
              {p.preguntas.map((q) => (
                <details key={q.pregunta} className="group py-4" open>
                  <summary className="cursor-pointer text-[19px] font-bold">{q.pregunta}</summary>
                  <p className="mt-2">{q.respuesta}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        <aside className="oscuro flex flex-col gap-5 rounded-md bg-negro p-6 text-blanco md:flex-row md:items-center md:justify-between md:p-9">
          <div>
            <h2 className="titular text-[30px] md:text-[36px]">¿No estás seguro?</h2>
            <p className="mt-2 max-w-[56ch] text-gris-300">
              Pasanos el año y el motor de tu {auto} y te decimos cuál le va.
            </p>
          </div>
          <a href={p.whatsapp.url} className="boton boton-fantasma flex-none">
            <MessageCircle aria-hidden size={22} />
            Escribinos por WhatsApp
          </a>
        </aside>
        <p className="mt-6 text-[15px] text-gris-600">
          Actualizado el {new Date(p.actualizadoEn).toLocaleDateString('es-AR')}.
        </p>
      </div>
    </>
  );
}
