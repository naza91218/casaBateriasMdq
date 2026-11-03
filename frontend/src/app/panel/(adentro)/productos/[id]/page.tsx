import type { ProductoAdmin, VehiculoAdmin } from '@casa/shared';
import { ChevronLeft, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FormProducto } from '@/components/panel/FormProducto';
import { Tarjeta } from '@/components/panel/Formulario';
import { FotosProducto } from '@/components/panel/FotosProducto';
import { ErrorApi } from '@/lib/api';
import { pedirPanel } from '@/lib/panel';

export const metadata = { title: 'Producto' };
type Autos = { items: VehiculoAdmin[]; total: number };

export default async function EditarProducto({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id === 'nuevo') {
    return (
      <>
        <Volver />
        <h1 className="mt-2 text-[32px] leading-tight font-bold">Nuevo producto</h1>
        <p className="mt-1 text-gris-600">
          Queda pausado hasta que tenga precio y foto, y lo publiques.
        </p>
        <div className="mt-6 max-w-[900px]">
          <Tarjeta titulo="Datos">
            <FormProducto />
          </Tarjeta>
        </div>
      </>
    );
  }

  let p: ProductoAdmin;
  try {
    p = await pedirPanel<ProductoAdmin>(`/admin/productos/${encodeURIComponent(id)}`);
  } catch (e) {
    if (e instanceof ErrorApi && (e.estado === 404 || e.estado === 400)) notFound();
    throw e;
  }
  const autos = await pedirPanel<Autos>(
    `/admin/vehiculos?medida=${encodeURIComponent(p.medida)}&porPagina=100`,
  );
  return (
    <>
      <Volver />
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-[32px] leading-tight font-bold">{p.nombre}</h1>
        {p.estado === 'activo' && (
          <Link
            href={`/producto/${p.slug}`}
            target="_blank"
            className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-rojo-texto underline"
          >
            Ver en la tienda <ExternalLink aria-hidden size={18} />
          </Link>
        )}
      </div>
      <p className="num mt-1 text-gris-600">
        {p.sku} · cargado desde {p.fuente}
      </p>
      {p.faltaParaActivar.length > 0 && (
        <p className="mt-3 rounded-sm border-2 border-amarillo-aviso bg-blanco p-3 font-semibold">
          Para publicarlo: {p.faltaParaActivar.join(' · ').toLowerCase()}.
        </p>
      )}
      <div className="mt-6 grid max-w-[1100px] gap-5">
        <Tarjeta titulo="Fotos">
          <FotosProducto productoId={p.id} fotos={p.fotos} />
        </Tarjeta>
        <Tarjeta titulo="Datos">
          <FormProducto producto={p} />
        </Tarjeta>
        <LeSirve medida={p.medida} autos={autos} />
      </div>
    </>
  );
}

function Volver() {
  return (
    <Link
      href="/panel/productos"
      className="inline-flex min-h-11 items-center gap-1 font-semibold text-negro no-underline hover:text-rojo-texto"
    >
      <ChevronLeft aria-hidden size={22} />
      Productos
    </Link>
  );
}

/** Solo lectura: la compatibilidad se carga en cada auto (auto → medida), no en el producto. */
function LeSirve({ medida, autos }: { medida: string; autos: Autos }) {
  const porMarca = new Map<string, VehiculoAdmin[]>();
  for (const v of autos.items) porMarca.set(v.marca, [...(porMarca.get(v.marca) ?? []), v]);
  return (
    <Tarjeta titulo="Le sirve a estos autos">
      <p className="-mt-2 mb-4 text-[15px] text-gris-600">
        Los autos que llevan la medida <span className="num font-semibold">{medida}</span>. Para
        cambiarlo, editá el auto en{' '}
        <Link href="/panel/vehiculos" className="font-semibold text-rojo-texto underline">
          Autos
        </Link>
        .
      </p>
      {autos.items.length === 0 ? (
        <p className="font-semibold">
          Ningún auto lleva esta medida todavía: no va a aparecer en el buscador por auto.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {[...porMarca].map(([marca, lista]) => (
            <div key={marca}>
              <h3 className="font-bold">{marca}</h3>
              <ul className="mt-1 flex flex-wrap gap-2">
                {lista.map((v) => (
                  <li key={v.id}>
                    <Link
                      href={`/panel/vehiculos?q=${encodeURIComponent(`${v.marca} ${v.modelo}`)}`}
                      className="num inline-flex min-h-11 items-center rounded-full border-2 border-gris-300 bg-blanco px-4 font-semibold text-negro no-underline hover:border-negro"
                    >
                      {v.modelo}
                      {v.motor && ` · ${v.motor}`}
                      <span className="ml-1.5 font-medium text-gris-600">
                        {v.anioDesde ? `${v.anioDesde}–${v.anioHasta}` : 'todos los años'}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {autos.total > autos.items.length && (
            <p className="text-[15px] text-gris-600">Y {autos.total - autos.items.length} más.</p>
          )}
        </div>
      )}
    </Tarjeta>
  );
}
