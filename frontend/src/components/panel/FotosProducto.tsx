'use client';

import type { ProductoAdmin } from '@casa/shared';
import { ArrowLeft, ArrowRight, Camera, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { enviar, ErrorApi } from '@/lib/api';
import { Aviso } from './Formulario';

type Foto = ProductoAdmin['fotos'][number];

/**
 * Fotos del producto (FR-045): subir desde el celular o la compu (el servidor las pasa a WebP y
 * les borra los datos EXIF), cambiar el orden (la primera es la de la tarjeta) y borrar.
 */
export function FotosProducto({
  productoId,
  fotos: iniciales,
}: {
  productoId: string;
  fotos: Foto[];
}) {
  const router = useRouter();
  const [fotos, setFotos] = useState(iniciales);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const base = `/admin/productos/${productoId}/fotos`;

  async function correr(accion: () => Promise<Foto[]>) {
    setOcupado(true);
    setError(null);
    try {
      setFotos(await accion());
      router.refresh();
    } catch (e) {
      setError(
        e instanceof ErrorApi && e.estado < 500
          ? (Object.values(e.campos)[0] ?? e.message)
          : 'No se pudo. Probá de nuevo.',
      );
    } finally {
      setOcupado(false);
    }
  }

  const subir = (archivos: FileList | null) => {
    if (!archivos?.length) return;
    const datos = new FormData();
    for (const a of archivos) datos.append('fotos', a);
    void correr(() => enviar<Foto[]>(base, datos));
    if (input.current) input.current.value = '';
  };

  const mover = (i: number, d: -1 | 1) => {
    const ids = fotos.map((f) => f.id);
    [ids[i], ids[i + d]] = [ids[i + d]!, ids[i]!];
    void correr(() => enviar<Foto[]>(`${base}/orden`, { ids }, undefined, 'PATCH'));
  };

  return (
    <div className="flex flex-col gap-4">
      {fotos.length === 0 ? (
        <p className="text-gris-600">Todavía no tiene fotos. Sin foto no se puede publicar.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {fotos.map((f, i) => (
            <li key={f.id} className="flex flex-col gap-2 rounded-md border-2 border-gris-200 p-2">
              <div className="grid aspect-square place-items-center rounded-sm bg-gris-100">
                <img src={f.url} alt={`Foto ${i + 1}`} className="h-full w-full object-contain" />
              </div>
              <p className="text-[15px] font-semibold">{i === 0 ? 'Principal' : `Foto ${i + 1}`}</p>
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={ocupado || i === 0}
                  onClick={() => mover(i, -1)}
                  aria-label={`Mover la foto ${i + 1} antes`}
                  className="grid size-11 place-items-center rounded-sm border-2 border-gris-300 disabled:opacity-40"
                >
                  <ArrowLeft aria-hidden size={18} />
                </button>
                <button
                  type="button"
                  disabled={ocupado || i === fotos.length - 1}
                  onClick={() => mover(i, 1)}
                  aria-label={`Mover la foto ${i + 1} después`}
                  className="grid size-11 place-items-center rounded-sm border-2 border-gris-300 disabled:opacity-40"
                >
                  <ArrowRight aria-hidden size={18} />
                </button>
                <button
                  type="button"
                  disabled={ocupado}
                  onClick={() =>
                    correr(() => enviar<Foto[]>(`${base}/${f.id}`, undefined, undefined, 'DELETE'))
                  }
                  aria-label={`Borrar la foto ${i + 1}`}
                  className="ml-auto grid size-11 place-items-center rounded-sm border-2 border-gris-300 text-rojo-texto disabled:opacity-40"
                >
                  <Trash2 aria-hidden size={18} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {error && <Aviso tipo="error">{error}</Aviso>}
      <div>
        <input
          ref={input}
          id="subir-fotos"
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => subir(e.target.files)}
          className="sr-only"
        />
        <label
          htmlFor="subir-fotos"
          className={`boton boton-negro w-full md:w-fit ${ocupado ? 'pointer-events-none opacity-70' : ''}`}
        >
          <Camera aria-hidden size={22} />
          {ocupado ? 'Subiendo…' : 'Agregar fotos'}
        </label>
        <p className="mt-1.5 text-[15px] text-gris-600">
          Hasta 10 por vez, de 5 MB como máximo cada una. Desde el celular podés sacarla en el
          momento.
        </p>
      </div>
    </div>
  );
}
