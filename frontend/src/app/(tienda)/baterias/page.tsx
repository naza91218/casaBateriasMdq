import type { ListadoProductos, MarcaCatalogo, Medida } from '@casa/shared';
import { PATRON_MEDIDA } from '@casa/shared/medidas';
import { ChevronLeft, ChevronRight, MessageCircle, SlidersHorizontal } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Palabras } from '@/components/Palabras';
import { TarjetaProducto } from '@/components/catalogo/TarjetaProducto';
import { Buscador } from '@/components/portada/Buscador';
import { api, intentar, pedir } from '@/lib/api';
import { datosTienda, whatsappDe } from '@/lib/tienda';

export const metadata: Metadata = {
  title: 'Catálogo de baterías',
  description:
    'Baterías Sermat, Edna, Herbo y Volta en Mar del Plata, económicas y reforzadas, con colocación incluida y hasta 18 meses de garantía.',
};

type Params = { marca?: string; medida?: string; gama?: string; orden?: string; pagina?: string };

const POR_PAGINA = 24;
const ORDENES = [
  ['relevantes', 'Más relevantes'],
  ['precio-asc', 'Menor precio'],
  ['precio-desc', 'Mayor precio'],
  ['amperaje', 'Mayor amperaje'],
  ['nombre', 'Nombre (A-Z)'],
] as const;
type Orden = (typeof ORDENES)[number][0];

const GAMAS = [
  ['', 'Todas'],
  ['economica', 'Económicas'],
  ['reforzada', 'Reforzadas'],
] as const;

/** Arma la dirección del catálogo con los filtros que quedan, sin parámetros vacíos. */
function url(p: Params, cambios: Partial<Params>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...p, ...cambios })) if (v) q.set(k, v);
  const s = q.toString();
  return s ? `/baterias?${s}` : '/baterias';
}

export default async function Catalogo({ searchParams }: { searchParams: Promise<Params> }) {
  const p = await searchParams;
  const marca = p.marca || undefined;
  const medida = p.medida && PATRON_MEDIDA.test(p.medida) ? p.medida : undefined;
  const gama = p.gama === 'economica' || p.gama === 'reforzada' ? p.gama : undefined;
  const orden: Orden = ORDENES.some(([v]) => v === p.orden) ? (p.orden as Orden) : 'relevantes';
  const pagina = Math.max(1, Number.parseInt(p.pagina ?? '1', 10) || 1);

  const q = new URLSearchParams({ pagina: String(pagina), porPagina: String(POR_PAGINA) });
  if (marca) q.set('marca', marca);
  if (medida) q.set('medida', medida);
  if (gama) q.set('gama', gama);
  if (orden !== 'relevantes') q.set('orden', orden);

  const [listado, marcas, medidas, datos, marcasAutos] = await Promise.all([
    intentar(pedir<ListadoProductos>(`/catalogo/productos?${q}`, { etiquetas: ['catalogo'] })),
    intentar(pedir<MarcaCatalogo[]>('/catalogo/marcas', { etiquetas: ['catalogo'] })),
    intentar(pedir<Medida[]>('/catalogo/medidas', { etiquetas: ['catalogo'] })),
    datosTienda(),
    intentar(api.marcas()),
  ]);
  const whatsappUrl = whatsappDe(datos);
  const paginas = listado ? Math.ceil(listado.total / POR_PAGINA) : 0;
  const hayFiltros = Boolean(marca || medida || gama);

  return (
    <>
      <section aria-labelledby="catalogo-titulo" className="bg-gris-100">
        <div className="mx-auto max-w-[1200px] px-4 py-10 md:px-12 md:py-14">
          <h1 id="catalogo-titulo" className="al-cargar titular text-[48px] md:text-[72px]">
            <Palabras texto="Catálogo" />
          </h1>
          <p className="mt-3 max-w-[60ch] text-[19px]">
            Todas nuestras baterías, con colocación incluida. Si no sabés la medida, buscala por tu
            auto; si la sabés, filtrá por medida, marca y gama.
          </p>
          <div className="mt-8">
            <Buscador marcas={marcasAutos} whatsapp={datos.whatsapp} />
          </div>

          <h2 className="titular mt-12 text-[30px] md:text-[38px]">O filtrá por medida</h2>

          {/* Filtros: un formulario GET, así funcionan sin JavaScript y la dirección se puede compartir. */}
          <form
            action="/baterias"
            className="mt-5 grid gap-4 md:grid-cols-[1fr_1fr_auto] lg:grid-cols-[1fr_1fr_auto_1fr_auto] md:items-end"
          >
            <div className="flex flex-col gap-2">
              <label htmlFor="f-marca" className="text-[17px] font-bold">
                Marca
              </label>
              <select id="f-marca" name="marca" defaultValue={marca ?? ''} className="selector">
                <option value="">Todas</option>
                {marcas?.map((m) => (
                  <option key={m.slug} value={m.slug}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="f-medida" className="text-[17px] font-bold">
                Medida
              </label>
              <select
                id="f-medida"
                name="medida"
                defaultValue={medida ?? ''}
                className="selector num"
              >
                <option value="">Todas</option>
                {medidas?.map((m) => (
                  <option key={m.codigo} value={m.codigo}>
                    {m.codigo}
                  </option>
                ))}
              </select>
            </div>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-[17px] font-bold">Gama</legend>
              <div className="flex gap-2">
                {GAMAS.map(([valor, texto]) => (
                  <label
                    key={valor}
                    className="flex min-h-[60px] cursor-pointer items-center rounded-sm border-2 border-gris-300 bg-blanco px-4 font-semibold has-checked:border-negro has-checked:bg-negro has-checked:text-blanco has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-negro"
                  >
                    <input
                      type="radio"
                      name="gama"
                      value={valor}
                      defaultChecked={(gama ?? '') === valor}
                      className="sr-only"
                    />
                    {texto}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="flex flex-col gap-2">
              <label htmlFor="f-orden" className="text-[17px] font-bold">
                Ordenar por
              </label>
              <select id="f-orden" name="orden" defaultValue={orden} className="selector">
                {ORDENES.map(([valor, texto]) => (
                  <option key={valor} value={valor}>
                    {texto}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="boton boton-negro">
              <SlidersHorizontal aria-hidden size={22} />
              Filtrar
            </button>
          </form>
        </div>
      </section>

      <div className="mx-auto max-w-[1200px] px-4 py-10 md:px-12 md:py-14">
        {listado === null ? (
          <Vacio
            titulo="No pudimos cargar las baterías"
            texto="Hay un problema de nuestro lado. Probá de nuevo en un rato o escribinos y te ayudamos."
            whatsappUrl={whatsappUrl}
          />
        ) : listado.items.length === 0 ? (
          <Vacio
            titulo="No hay baterías con esos filtros"
            texto="Probá con otra medida o marca, o escribinos y te decimos cuál te conviene."
            whatsappUrl={whatsappUrl}
            limpiar={hayFiltros}
          />
        ) : (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <p aria-live="polite" className="text-[19px] font-semibold">
                <span className="num">{listado.total}</span>{' '}
                {listado.total === 1 ? 'batería' : 'baterías'}
              </p>
              {hayFiltros && (
                <Link
                  href="/baterias"
                  className="min-h-12 font-semibold text-rojo-texto underline hover:text-negro"
                >
                  Sacar los filtros
                </Link>
              )}
            </div>
            <ul className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {listado.items.map((prod) => (
                <li key={prod.id} className="flex">
                  <TarjetaProducto p={prod} whatsapp={datos.whatsapp} />
                </li>
              ))}
            </ul>

            {paginas > 1 && (
              <nav aria-label="Páginas" className="mt-10 flex items-center justify-center gap-3">
                {pagina > 1 && (
                  <Link
                    href={url(p, { pagina: String(pagina - 1) })}
                    className="boton boton-borde"
                    rel="prev"
                  >
                    <ChevronLeft aria-hidden size={22} />
                    Anterior
                  </Link>
                )}
                <span className="num px-2 font-semibold">
                  Página {pagina} de {paginas}
                </span>
                {pagina < paginas && (
                  <Link
                    href={url(p, { pagina: String(pagina + 1) })}
                    className="boton boton-borde"
                    rel="next"
                  >
                    Siguiente
                    <ChevronRight aria-hidden size={22} />
                  </Link>
                )}
              </nav>
            )}
          </>
        )}
      </div>
    </>
  );
}

function Vacio({
  titulo,
  texto,
  whatsappUrl,
  limpiar = false,
}: {
  titulo: string;
  texto: string;
  whatsappUrl: string;
  limpiar?: boolean;
}) {
  return (
    <div className="max-w-[640px] rounded-md border-2 border-negro p-6 md:p-9">
      <h2 className="titular text-[32px] md:text-[40px]">{titulo}</h2>
      <p className="mt-3">{texto}</p>
      <div className="mt-6 flex flex-col gap-3 md:flex-row">
        <a href={whatsappUrl} className="boton boton-rojo">
          <MessageCircle aria-hidden size={22} />
          Escribinos por WhatsApp
        </a>
        {limpiar && (
          <Link href="/baterias" className="boton boton-borde">
            Ver todas
          </Link>
        )}
      </div>
    </div>
  );
}
