import type { Medida, OpcionVehiculo, VehiculoAdmin } from '@casa/shared';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Vehiculos } from '@/components/panel/Vehiculos';
import { pedirPanel } from '@/lib/panel';

export const metadata = { title: 'Autos' };

const POR_PAGINA = 50;

export default async function PaginaVehiculos({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; marca?: string; pagina?: string }>;
}) {
  const p = await searchParams;
  const pagina = Math.max(1, Number.parseInt(p.pagina ?? '1', 10) || 1);
  const filtros = {
    ...(p.q?.trim() ? { q: p.q.trim() } : {}),
    ...(p.marca ? { marca: p.marca } : {}),
  };
  const q = new URLSearchParams({
    ...filtros,
    pagina: String(pagina),
    porPagina: String(POR_PAGINA),
  });
  const [lista, medidas, marcas] = await Promise.all([
    pedirPanel<{ items: VehiculoAdmin[]; total: number }>(`/admin/vehiculos?${q}`),
    pedirPanel<Medida[]>('/catalogo/medidas'),
    pedirPanel<OpcionVehiculo[]>('/vehiculos/marcas'),
  ]);
  const paginas = Math.ceil(lista.total / POR_PAGINA);
  const url = (n: number) =>
    `/panel/vehiculos?${new URLSearchParams({ ...filtros, pagina: String(n) })}`;
  return (
    <>
      <h1 className="text-[32px] leading-tight font-bold">Autos</h1>
      <p className="mt-1 max-w-[70ch] text-gris-600">
        Qué medida lleva cada auto. Es lo que usa el buscador de la tienda. Para cargar muchos de
        una vez, usá{' '}
        <Link href="/panel/importar" className="font-semibold text-rojo-texto underline">
          Importar planilla
        </Link>
        .
      </p>
      <form action="/panel/vehiculos" className="mt-5 flex flex-col gap-2 md:flex-row">
        <label htmlFor="marca" className="sr-only">
          Marca
        </label>
        <select
          id="marca"
          name="marca"
          defaultValue={p.marca ?? ''}
          className="selector !h-12 md:max-w-[240px]"
        >
          <option value="">Todas las marcas</option>
          {marcas.map((m) => (
            <option key={m.slug} value={m.nombre}>
              {m.nombre}
            </option>
          ))}
        </select>
        <label htmlFor="q" className="sr-only">
          Buscar
        </label>
        <input
          id="q"
          name="q"
          defaultValue={p.q}
          placeholder="Buscar por marca o modelo"
          className="h-12 w-full rounded-sm border-2 border-gris-300 bg-blanco px-3.5 text-[17px] focus-visible:border-negro focus-visible:outline-none md:max-w-[420px]"
        />
        <button type="submit" className="boton boton-borde !min-h-12 !px-4 !text-[17px]">
          Buscar
        </button>
      </form>
      <p className="num mt-4 text-gris-600">{lista.total} autos</p>
      <Vehiculos vehiculos={lista.items} medidas={medidas.map((m) => m.codigo)} />
      {paginas > 1 && (
        <nav aria-label="Páginas" className="mt-6 flex items-center justify-center gap-3">
          {pagina > 1 && (
            <Link href={url(pagina - 1)} className="boton boton-borde">
              <ChevronLeft aria-hidden size={22} /> Anterior
            </Link>
          )}
          <span className="num font-semibold">
            Página {pagina} de {paginas}
          </span>
          {pagina < paginas && (
            <Link href={url(pagina + 1)} className="boton boton-borde">
              Siguiente <ChevronRight aria-hidden size={22} />
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
