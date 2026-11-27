import type { ListaProductosAdmin } from '@casa/shared';
import { ChevronLeft, ChevronRight, Plus, Upload } from 'lucide-react';
import Link from 'next/link';
import { ListaRevision } from '@/components/panel/ListaRevision';
import { pedirPanel } from '@/lib/panel';

export const metadata = { title: 'Productos' };

const POR_PAGINA = 30;
const FILTROS = [
  ['', 'Todos'],
  ['a_revisar', 'A revisar'],
  ['activo', 'Publicados'],
  ['pausado', 'Pausados'],
] as const;

export default async function Productos({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; q?: string; pagina?: string }>;
}) {
  const p = await searchParams;
  const estado = FILTROS.some(([v]) => v && v === p.estado) ? p.estado : undefined;
  const pagina = Math.max(1, Number.parseInt(p.pagina ?? '1', 10) || 1);
  const q = new URLSearchParams({ pagina: String(pagina), porPagina: String(POR_PAGINA) });
  if (estado) q.set('estado', estado);
  if (p.q?.trim()) q.set('q', p.q.trim());
  const lista = await pedirPanel<ListaProductosAdmin>(`/admin/productos?${q}`);
  const paginas = Math.ceil(lista.total / POR_PAGINA);
  const url = (c: { estado?: string; pagina?: number }) => {
    const u = new URLSearchParams();
    const e = 'estado' in c ? c.estado : estado;
    if (e) u.set('estado', e);
    if (p.q) u.set('q', p.q);
    if (c.pagina && c.pagina > 1) u.set('pagina', String(c.pagina));
    return `/panel/productos${u.size ? `?${u}` : ''}`;
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[32px] leading-tight font-bold">Productos</h1>
        <div className="flex flex-wrap gap-2">
          <Link href="/panel/importar" className="boton boton-borde !min-h-12 !px-4 !text-[17px]">
            <Upload aria-hidden size={20} /> Importar planilla
          </Link>
          <Link
            href="/panel/productos/nuevo"
            className="boton boton-negro !min-h-12 !px-4 !text-[17px]"
          >
            <Plus aria-hidden size={20} /> Nuevo producto
          </Link>
        </div>
      </div>

      <form action="/panel/productos" className="mt-5 flex flex-col gap-2 md:flex-row">
        {estado && <input type="hidden" name="estado" value={estado} />}
        <label htmlFor="q" className="sr-only">
          Buscar
        </label>
        <input
          id="q"
          name="q"
          defaultValue={p.q}
          placeholder="Buscar por nombre, código o medida"
          className="h-12 w-full rounded-sm border-2 border-gris-300 bg-blanco px-3.5 text-[17px] focus-visible:border-negro focus-visible:outline-none md:max-w-[420px]"
        />
        <button type="submit" className="boton boton-borde !min-h-12 !px-4 !text-[17px]">
          Buscar
        </button>
      </form>

      <nav aria-label="Filtrar por estado" className="mt-4 flex flex-wrap gap-2">
        {FILTROS.map(([v, texto]) => (
          <Link
            key={v || 'todos'}
            href={url({ estado: v || undefined })}
            aria-current={(estado ?? '') === v ? 'page' : undefined}
            className={`inline-flex min-h-11 items-center rounded-full border-2 px-4 font-semibold no-underline ${(estado ?? '') === v ? 'border-negro bg-negro text-blanco' : 'border-gris-300 bg-blanco text-negro hover:border-negro'}`}
          >
            {texto}
          </Link>
        ))}
      </nav>

      <ListaRevision productos={lista.items} total={lista.total} />

      {paginas > 1 && (
        <nav aria-label="Páginas" className="mt-6 flex items-center justify-center gap-3">
          {pagina > 1 && (
            <Link href={url({ pagina: pagina - 1 })} className="boton boton-borde">
              <ChevronLeft aria-hidden size={22} /> Anterior
            </Link>
          )}
          <span className="num font-semibold">
            Página {pagina} de {paginas}
          </span>
          {pagina < paginas && (
            <Link href={url({ pagina: pagina + 1 })} className="boton boton-borde">
              Siguiente <ChevronRight aria-hidden size={22} />
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
