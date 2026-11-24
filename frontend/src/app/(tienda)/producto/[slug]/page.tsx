import type { FichaProducto } from '@casa/shared';
import { Check, ChevronLeft, ImageIcon, MessageCircle } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { Medir } from '@/components/Analitica';
import { AgregarAlCarrito } from '@/components/catalogo/AgregarAlCarrito';
import { ErrorApi, pedir } from '@/lib/api';
import { fotoDeMarca } from '@/lib/foto-marca';
import { pesos } from '@/lib/formato';

const GAMA = { economica: 'Económica', reforzada: 'Reforzada' } as const;

const ficha = cache(async (slug: string): Promise<FichaProducto | null> => {
  try {
    return await pedir<FichaProducto>(`/catalogo/productos/${encodeURIComponent(slug)}`, {
      etiquetas: ['catalogo', `producto:${slug}`],
    });
  } catch (e) {
    if (e instanceof ErrorApi && e.estado === 404) return null;
    throw e;
  }
});

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await ficha((await params).slug);
  if (!p) return { title: 'Batería no encontrada' };
  return {
    title: `${p.nombre} con colocación en Mar del Plata`,
    description: `Batería ${p.nombre}: ${pesos(p.precios.transferenciaOEfectivo)} con transferencia. Colocación incluida y ${p.garantiaMeses} meses de garantía.`,
  };
}

export default async function Ficha({ params }: Props) {
  const p = await ficha((await params).slug);
  if (!p) notFound();

  const fotos = p.fotos.length ? p.fotos : p.foto ? [p.foto] : [];
  const porMarca = new Map<string, FichaProducto['autosCompatibles']>();
  for (const a of p.autosCompatibles) porMarca.set(a.marca, [...(porMarca.get(a.marca) ?? []), a]);
  const especificaciones: [string, string][] = [
    ['Medida', p.medida],
    ['Capacidad', `${p.amperajeAh} Ah`],
    ['Corriente de arranque', p.cca ? `${p.cca} A` : '[a confirmar]'],
    ['Gama', GAMA[p.gama]],
    ['Marca', p.marca.nombre],
    ['Garantía', `${p.garantiaMeses} meses`],
  ];

  // Datos estructurados para Google (FR-053): producto con precio y disponibilidad.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.nombre,
    brand: { '@type': 'Brand', name: p.marca.nombre },
    ...(fotos.length ? { image: fotos } : {}),
    offers: {
      '@type': 'Offer',
      priceCurrency: 'ARS',
      price: (p.precios.transferenciaOEfectivo / 100).toFixed(0),
      availability: p.disponible ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
  };

  return (
    <>
      <Medir
        evento="view_item"
        items={[{ id: p.id, nombre: p.nombre, precio: p.precios.lista, cantidad: 1 }]}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <div className="mx-auto max-w-[1200px] px-4 pt-6 pb-16 md:px-12 md:pt-8 md:pb-24">
        <Link
          href="/#buscador"
          className="inline-flex min-h-12 items-center gap-1.5 rounded-sm font-semibold text-negro no-underline hover:text-rojo-texto"
        >
          <ChevronLeft aria-hidden size={22} />
          Buscar por auto
        </Link>

        <div className="mt-4 grid gap-10 md:grid-cols-[1.05fr_1fr] md:gap-14">
          {/* Fotos */}
          <div>
            <div className="relative grid aspect-[4/3] place-items-center rounded-md bg-gris-100 p-8">
              {fotos[0] ? (
                <img src={fotos[0]} alt={p.nombre} className="h-full w-auto object-contain" />
              ) : fotoDeMarca(p.marca.slug) ? (
                <>
                  <img
                    src={fotoDeMarca(p.marca.slug) ?? ''}
                    alt={`Batería ${p.marca.nombre} (foto ilustrativa)`}
                    className="h-full w-auto object-contain"
                  />
                  <span className="absolute right-3 bottom-3 rounded-sm bg-blanco/90 px-2.5 py-1 text-[15px] font-semibold text-gris-600">
                    Foto ilustrativa
                  </span>
                </>
              ) : (
                <span className="flex flex-col items-center gap-2 font-semibold text-gris-600">
                  <ImageIcon aria-hidden size={48} strokeWidth={1.5} />
                  [Foto de {p.nombre}]
                </span>
              )}
            </div>
            {fotos.length > 1 && (
              <ul className="mt-3 grid grid-cols-4 gap-3">
                {fotos.slice(1, 5).map((f) => (
                  <li
                    key={f}
                    className="grid aspect-square place-items-center rounded-md bg-gris-100 p-2"
                  >
                    <img src={f} alt="" loading="lazy" className="h-full w-auto object-contain" />
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Compra */}
          <div>
            <p className="text-[17px] font-semibold text-gris-600">
              {p.marca.nombre} · {GAMA[p.gama]}
            </p>
            <h1 className="titular mt-1 text-[44px] md:text-[60px]">{p.nombre}</h1>
            {p.descripcion && <p className="mt-3">{p.descripcion}</p>}

            {p.disponible ? (
              <>
                <p className="mt-6">
                  <span className="num block text-[40px] leading-none font-bold">
                    {pesos(p.precios.transferenciaOEfectivo)}
                  </span>
                  <span className="mt-1.5 block font-semibold text-rojo-texto">
                    con transferencia o efectivo ({p.precios.descuentoPct} % menos)
                  </span>
                  <span className="num mt-1 block text-gris-600">
                    {pesos(p.precios.lista)} con Mercado Pago (tarjeta o dinero en cuenta)
                  </span>
                </p>
                <div className="mt-7">
                  <AgregarAlCarrito
                    productoId={p.id}
                    slug={p.slug}
                    nombre={p.nombre}
                    precio={p.precios.lista}
                  />
                </div>
              </>
            ) : (
              <div className="mt-6 rounded-md border-2 border-negro p-5">
                <p className="text-[20px] font-bold">Sin stock por ahora</p>
                <p className="mt-1">
                  Escribinos y te avisamos cuando entra, o te recomendamos otra.
                </p>
              </div>
            )}

            <a
              href={p.whatsapp.url}
              className="mt-4 inline-flex min-h-12 items-center gap-2 rounded-sm font-semibold text-rojo-texto underline hover:text-negro"
            >
              <MessageCircle aria-hidden size={20} />
              ¿Dudas? Consultanos por WhatsApp
            </a>

            <ul className="mt-6 flex flex-col gap-2.5 border-t-2 border-gris-200 pt-6">
              {p.servicioIncluido.map((s) => (
                <li key={s} className="flex items-center gap-3 font-semibold">
                  <span className="grid size-6 flex-none place-items-center rounded-sm bg-rojo text-blanco">
                    <Check aria-hidden size={17} strokeWidth={3} />
                  </span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-14 grid gap-10 md:mt-20 md:grid-cols-2 md:gap-14">
          <section aria-labelledby="especificaciones">
            <h2 id="especificaciones" className="titular text-[32px] md:text-[40px]">
              Especificaciones
            </h2>
            <dl className="mt-5 border-t-2 border-negro">
              {especificaciones.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-gris-200 py-3.5">
                  <dt className="text-gris-600">{k}</dt>
                  <dd className="num text-right font-semibold">{v}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-8 rounded-md bg-gris-100 p-6">
              <h3 className="text-[21px] font-bold">¿Por qué {GAMA[p.gama].toLowerCase()}?</h3>
              <p className="mt-2">{p.explicacionGama}</p>
            </div>
          </section>

          <section aria-labelledby="compatibles">
            <h2 id="compatibles" className="titular text-[32px] md:text-[40px]">
              Autos compatibles
            </h2>
            {porMarca.size ? (
              <>
                <p className="mt-2 text-gris-600">
                  Le sirve a {p.autosCompatibles.length} modelos de {porMarca.size} marcas.
                </p>
                <ul className="mt-5 border-t-2 border-negro">
                  {[...porMarca].map(([marca, autos]) => (
                    <li key={marca} className="border-b border-gris-200">
                      <details className="group">
                        <summary className="flex min-h-13 cursor-pointer list-none items-center justify-between gap-4 py-3 font-semibold">
                          {marca}
                          <span className="num text-gris-600">
                            {autos.length} {autos.length === 1 ? 'modelo' : 'modelos'}
                          </span>
                        </summary>
                        <p className="pb-4 text-gris-600">
                          {autos
                            .map((a) =>
                              a.anioDesde || a.anioHasta
                                ? `${a.modelo} (${a.anioDesde ?? '…'}–${a.anioHasta ?? 'hoy'})`
                                : a.modelo,
                            )
                            .join(', ')}
                        </p>
                      </details>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="mt-3">
                Todavía no cargamos los autos de esta batería.{' '}
                <a href={p.whatsapp.url} className="text-rojo-texto underline">
                  Preguntanos si le sirve al tuyo
                </a>
                .
              </p>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
