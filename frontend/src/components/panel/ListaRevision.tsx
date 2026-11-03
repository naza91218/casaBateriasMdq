'use client';

import type { ProductoAdmin, ResultadoRevision } from '@casa/shared';
import { Check, ImageIcon, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { enviar, ErrorApi } from '@/lib/api';
import { pesos } from '@/lib/formato';
import { Aviso } from './Formulario';

const ESTADO = {
  a_revisar: ['A revisar', 'bg-amarillo-aviso text-negro'],
  activo: ['Publicado', 'bg-verde-ok text-blanco'],
  pausado: ['Pausado', 'bg-gris-200 text-gris-600'],
} as const;

/**
 * Lista de productos con selección para la revisión en lote (FR-070, FR-071): habilitar los que
 * ya tienen precio y foto, o eliminar los que no se venden. El servidor decide cada uno.
 */
export function ListaRevision({ productos, total }: { productos: ProductoAdmin[]; total: number }) {
  const router = useRouter();
  const [elegidos, setElegidos] = useState<Set<string>>(new Set());
  const [confirmar, setConfirmar] = useState<'habilitar' | 'eliminar' | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const alternar = (id: string) =>
    setElegidos((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const todos = productos.length > 0 && productos.every((p) => elegidos.has(p.id));

  async function aplicar(accion: 'habilitar' | 'eliminar') {
    setEnviando(true);
    setAviso(null);
    try {
      const r = await enviar<ResultadoRevision>('/admin/productos/revision', {
        ids: [...elegidos],
        accion,
      });
      const cuenta = (res: string) => r.resultados.filter((x) => x.resultado === res).length;
      const pausados = r.resultados.filter((x) => x.resultado === 'pausado');
      setAviso({
        tipo: 'ok',
        texto:
          accion === 'habilitar'
            ? `${cuenta('activo')} publicados.${pausados.length ? ` ${pausados.length} quedaron pausados: ${[...new Set(pausados.map((x) => x.motivo))].join('; ')}.` : ''}`
            : `${cuenta('eliminado')} eliminados${cuenta('archivado') ? ` y ${cuenta('archivado')} archivados (tienen pedidos)` : ''}.`,
      });
      setElegidos(new Set());
      setConfirmar(null);
      router.refresh();
    } catch (e) {
      setAviso({
        tipo: 'error',
        texto:
          e instanceof ErrorApi && e.estado < 500
            ? e.message
            : 'No se pudo aplicar. Probá de nuevo.',
      });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex min-h-11 cursor-pointer items-center gap-2.5 font-semibold">
          <input
            type="checkbox"
            checked={todos}
            onChange={() => setElegidos(todos ? new Set() : new Set(productos.map((p) => p.id)))}
            className="size-5"
          />
          Elegir los {productos.length} de esta página
        </label>
        <span className="num text-gris-600">· {total} en total</span>
      </div>

      {elegidos.size > 0 && (
        <div className="sticky top-0 z-10 mt-3 flex flex-col gap-3 rounded-md border-2 border-negro bg-blanco p-4 md:flex-row md:items-center">
          <p className="num font-bold">
            {elegidos.size} elegido{elegidos.size > 1 ? 's' : ''}
          </p>
          {confirmar ? (
            <>
              <p className="font-semibold">
                {confirmar === 'habilitar'
                  ? '¿Publicarlos en la tienda? Los que no tengan precio o foto quedan pausados.'
                  : '¿Eliminarlos? Los que ya tienen pedidos se archivan en vez de borrarse.'}
              </p>
              <div className="flex gap-2 md:ml-auto">
                <button
                  type="button"
                  disabled={enviando}
                  onClick={() => aplicar(confirmar)}
                  className="boton boton-rojo !min-h-12"
                >
                  {enviando ? 'Aplicando…' : 'Sí'}
                </button>
                <button
                  type="button"
                  disabled={enviando}
                  onClick={() => setConfirmar(null)}
                  className="boton boton-borde !min-h-12"
                >
                  No
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-wrap gap-2 md:ml-auto">
              <button
                type="button"
                onClick={() => setConfirmar('habilitar')}
                className="boton boton-negro !min-h-12 !px-4 !text-[17px]"
              >
                <Check aria-hidden size={20} /> Publicar
              </button>
              <button
                type="button"
                onClick={() => setConfirmar('eliminar')}
                className="boton boton-borde !min-h-12 !px-4 !text-[17px] !text-rojo-texto"
              >
                <Trash2 aria-hidden size={20} /> Eliminar
              </button>
            </div>
          )}
        </div>
      )}

      {aviso && (
        <div className="mt-3">
          <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>
        </div>
      )}

      {productos.length === 0 ? (
        <div className="mt-3 rounded-md border-2 border-gris-200 bg-blanco p-8 text-center">
          <p className="text-[20px] font-bold">No hay productos con ese filtro</p>
        </div>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {productos.map((p) => {
            const [texto, color] = ESTADO[p.estado];
            return (
              <li
                key={p.id}
                className={`flex items-center gap-3 rounded-md border-2 bg-blanco p-3 ${elegidos.has(p.id) ? 'border-negro' : 'border-gris-200'}`}
              >
                <input
                  type="checkbox"
                  checked={elegidos.has(p.id)}
                  onChange={() => alternar(p.id)}
                  aria-label={`Elegir ${p.nombre}`}
                  className="size-5 flex-none"
                />
                <span className="grid size-14 flex-none place-items-center overflow-hidden rounded-sm bg-gris-100">
                  {p.fotos[0] ? (
                    <img src={p.fotos[0].url} alt="" className="h-full w-full object-contain" />
                  ) : (
                    <ImageIcon aria-hidden size={22} className="text-gris-400" />
                  )}
                </span>
                <Link
                  href={`/panel/productos/${p.id}`}
                  className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)] gap-x-5 gap-y-1 no-underline md:grid-cols-[minmax(0,1fr)_120px_90px_auto] md:items-center"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-bold hover:underline">{p.nombre}</span>
                    <span className="num block truncate text-[15px] text-gris-600">
                      {p.sku} · {p.fuente}
                    </span>
                    {p.faltaParaActivar.length > 0 && (
                      <span className="block text-[15px] font-semibold text-rojo-texto">
                        {p.faltaParaActivar.join(' · ')}
                      </span>
                    )}
                  </span>
                  <span className="num font-semibold">
                    {p.precioLista ? pesos(p.precioLista) : 'Sin precio'}
                  </span>
                  <span className="num text-gris-600">Stock {p.stock}</span>
                  <span
                    className={`inline-flex h-7 w-fit items-center rounded-full px-3 text-[15px] font-bold ${color}`}
                  >
                    {texto}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
