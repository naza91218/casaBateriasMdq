'use client';

import type { ZonaAdmin } from '@casa/shared';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { enviar, ErrorApi } from '@/lib/api';
import { pesos } from '@/lib/formato';
import { aCentavos, aPesos, Aviso, CampoPanel, Tarjeta } from './Formulario';

/** Zonas de colocación (FR-017): solo las activas se ofrecen en el checkout. */
export function Zonas({ zonas }: { zonas: ZonaAdmin[] }) {
  const router = useRouter();
  const [editando, setEditando] = useState<string | 'nueva' | null>(null);
  const [nombre, setNombre] = useState('');
  const [costo, setCosto] = useState('');
  const [activa, setActiva] = useState(true);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [aviso, setAviso] = useState<string | null>(null);

  function abrir(z?: ZonaAdmin) {
    setEditando(z?.id ?? 'nueva');
    setNombre(z?.nombre ?? '');
    setCosto(z ? aPesos(z.costoExtra) : '0');
    setActiva(z?.activa ?? true);
    setErrores({});
    setAviso(null);
  }

  async function guardar() {
    const costoExtra = aCentavos(costo) ?? 0;
    if (Number.isNaN(costoExtra))
      return setErrores({ costoExtra: 'Escribí el costo en pesos, o 0 si no tiene' });
    try {
      if (editando === 'nueva') await enviar('/admin/zonas', { nombre, costoExtra, activa });
      else
        await enviar(
          `/admin/zonas/${editando}`,
          { nombre, costoExtra, activa },
          undefined,
          'PATCH',
        );
      setEditando(null);
      router.refresh();
    } catch (e) {
      if (e instanceof ErrorApi && Object.keys(e.campos).length) setErrores(e.campos);
      else setAviso(e instanceof ErrorApi && e.estado < 500 ? e.message : 'No se pudo guardar.');
    }
  }

  const formulario = (
    <div className="mt-3 flex flex-col gap-4 rounded-md border-2 border-negro p-4">
      <div className="grid gap-4 md:grid-cols-2">
        <CampoPanel
          id="zona-nombre"
          rotulo="Nombre"
          placeholder="Batán"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          error={errores.nombre}
        />
        <CampoPanel
          id="zona-costo"
          rotulo="Costo extra ($)"
          ayuda="0 si la colocación está incluida."
          inputMode="decimal"
          value={costo}
          onChange={(e) => setCosto(e.target.value)}
          error={errores.costoExtra}
        />
      </div>
      <label className="flex min-h-11 cursor-pointer items-center gap-2.5 font-semibold">
        <input
          type="checkbox"
          checked={activa}
          onChange={(e) => setActiva(e.target.checked)}
          className="size-5"
        />
        Se ofrece en el checkout
      </label>
      {aviso && <Aviso tipo="error">{aviso}</Aviso>}
      <div className="flex gap-2">
        <button type="button" onClick={guardar} className="boton boton-rojo !min-h-12">
          Guardar zona
        </button>
        <button
          type="button"
          onClick={() => setEditando(null)}
          className="boton boton-borde !min-h-12"
        >
          Cancelar
        </button>
      </div>
    </div>
  );

  return (
    <Tarjeta
      titulo="Zonas de colocación"
      accion={
        editando === null && (
          <button
            type="button"
            onClick={() => abrir()}
            className="boton boton-borde !min-h-11 !px-3 !text-[16px]"
          >
            <Plus aria-hidden size={18} /> Nueva zona
          </button>
        )
      }
    >
      <ul className="divide-y divide-gris-200 border-y border-gris-200">
        {zonas.map((z) => (
          <li key={z.id} className="py-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-bold">{z.nombre}</span>
              <span className="num text-gris-600">
                {z.costoExtra ? `+${pesos(z.costoExtra)}` : 'Sin costo extra'}
              </span>
              {!z.activa && (
                <span className="rounded-full bg-gris-200 px-3 py-0.5 text-[15px] font-bold text-gris-600">
                  No se ofrece
                </span>
              )}
              {editando === null && (
                <button
                  type="button"
                  onClick={() => abrir(z)}
                  className="ml-auto min-h-11 font-semibold text-rojo-texto underline"
                >
                  Editar
                </button>
              )}
            </div>
            {editando === z.id && formulario}
          </li>
        ))}
      </ul>
      {editando === 'nueva' && formulario}
    </Tarjeta>
  );
}
