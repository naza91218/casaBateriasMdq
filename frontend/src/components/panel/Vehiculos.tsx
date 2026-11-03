'use client';

import type { VehiculoAdmin } from '@casa/shared';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { enviar, ErrorApi } from '@/lib/api';
import { Aviso, CampoPanel } from './Formulario';

type Datos = {
  marca: string;
  modelo: string;
  anioDesde: string;
  anioHasta: string;
  motor: string;
  medidas: string;
};
const vacio: Datos = {
  marca: '',
  modelo: '',
  anioDesde: '',
  anioHasta: '',
  motor: '',
  medidas: '',
};

/** Autos y las medidas que llevan (FR-046). Sin años = vale para todos los años del modelo. */
export function Vehiculos({ vehiculos }: { vehiculos: VehiculoAdmin[] }) {
  const router = useRouter();
  const [editando, setEditando] = useState<string | 'nuevo' | null>(null);
  const [d, setD] = useState<Datos>(vacio);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [aviso, setAviso] = useState<string | null>(null);
  const [borrar, setBorrar] = useState<string | null>(null);

  function abrir(v?: VehiculoAdmin) {
    setEditando(v?.id ?? 'nuevo');
    setD(
      v
        ? {
            marca: v.marca,
            modelo: v.modelo,
            anioDesde: v.anioDesde ? String(v.anioDesde) : '',
            anioHasta: v.anioHasta ? String(v.anioHasta) : '',
            motor: v.motor ?? '',
            medidas: v.medidas.join(', '),
          }
        : vacio,
    );
    setErrores({});
    setAviso(null);
  }

  async function guardar() {
    const cuerpo = {
      marca: d.marca,
      modelo: d.modelo,
      anioDesde: d.anioDesde ? Number(d.anioDesde) : null,
      anioHasta: d.anioHasta ? Number(d.anioHasta) : null,
      motor: d.motor,
      medidas: d.medidas
        .split(/[,\s]+/)
        .map((m) => m.trim().toLowerCase())
        .filter(Boolean),
    };
    try {
      if (editando === 'nuevo') await enviar('/admin/vehiculos', cuerpo);
      else await enviar(`/admin/vehiculos/${editando}`, cuerpo, undefined, 'PATCH');
      setEditando(null);
      router.refresh();
    } catch (e) {
      if (e instanceof ErrorApi && Object.keys(e.campos).length)
        setErrores(
          Object.fromEntries(
            Object.entries(e.campos).map(([k, m]) => [k.replace(/\.\d+$/, ''), m]),
          ),
        );
      else setAviso(e instanceof ErrorApi && e.estado < 500 ? e.message : 'No se pudo guardar.');
    }
  }

  async function eliminar(id: string) {
    try {
      await enviar(`/admin/vehiculos/${id}`, undefined, undefined, 'DELETE');
      setBorrar(null);
      router.refresh();
    } catch {
      setAviso('No se pudo eliminar.');
    }
  }

  const set = (k: keyof Datos) => (e: { target: { value: string } }) =>
    setD((x) => ({ ...x, [k]: e.target.value }));
  const formulario = (
    <div className="flex flex-col gap-4 rounded-md border-2 border-negro bg-blanco p-4">
      <div className="grid gap-4 md:grid-cols-3">
        <CampoPanel
          id="v-marca"
          rotulo="Marca"
          placeholder="Volkswagen"
          value={d.marca}
          onChange={set('marca')}
          error={errores.marca}
        />
        <CampoPanel
          id="v-modelo"
          rotulo="Modelo"
          placeholder="Gol Trend"
          value={d.modelo}
          onChange={set('modelo')}
          error={errores.modelo}
        />
        <CampoPanel
          id="v-motor"
          rotulo="Motor (opcional)"
          placeholder="1.6 nafta"
          value={d.motor}
          onChange={set('motor')}
          error={errores.motor}
        />
        <CampoPanel
          id="v-desde"
          rotulo="Año desde"
          ayuda="Vacío = todos los años."
          inputMode="numeric"
          value={d.anioDesde}
          onChange={set('anioDesde')}
          error={errores.anioDesde}
        />
        <CampoPanel
          id="v-hasta"
          rotulo="Año hasta"
          inputMode="numeric"
          value={d.anioHasta}
          onChange={set('anioHasta')}
          error={errores.anioHasta}
        />
        <CampoPanel
          id="v-medidas"
          rotulo="Medidas"
          ayuda="Separadas por coma: 12x65, 12x70."
          value={d.medidas}
          onChange={set('medidas')}
          error={errores.medidas}
        />
      </div>
      {aviso && <Aviso tipo="error">{aviso}</Aviso>}
      <div className="flex gap-2">
        <button type="button" onClick={guardar} className="boton boton-rojo !min-h-12">
          Guardar auto
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
    <div className="mt-5 flex flex-col gap-3">
      {editando === null ? (
        <button
          type="button"
          onClick={() => abrir()}
          className="boton boton-negro w-full !min-h-12 md:w-fit"
        >
          <Plus aria-hidden size={20} /> Agregar auto
        </button>
      ) : (
        editando === 'nuevo' && formulario
      )}
      {vehiculos.length === 0 ? (
        <div className="rounded-md border-2 border-gris-200 bg-blanco p-8 text-center font-bold">
          No hay autos con esa búsqueda
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {vehiculos.map((v) => (
            <li key={v.id}>
              {editando === v.id ? (
                formulario
              ) : (
                <div className="flex flex-col gap-2 rounded-md border-2 border-gris-200 bg-blanco p-3 md:flex-row md:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">
                      {v.marca} {v.modelo}
                      {v.motor && <span className="font-semibold text-gris-600"> · {v.motor}</span>}
                    </p>
                    <p className="num text-[15px] text-gris-600">
                      {v.anioDesde ? `${v.anioDesde}–${v.anioHasta}` : 'Todos los años'} ·{' '}
                      {v.medidas.join(', ')} · {v.fuente}
                    </p>
                  </div>
                  {borrar === v.id ? (
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">¿Eliminarlo?</span>
                      <button
                        type="button"
                        onClick={() => eliminar(v.id)}
                        className="boton boton-rojo !min-h-11 !px-4 !text-[16px]"
                      >
                        Sí
                      </button>
                      <button
                        type="button"
                        onClick={() => setBorrar(null)}
                        className="boton boton-borde !min-h-11 !px-4 !text-[16px]"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    editando === null && (
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => abrir(v)}
                          className="min-h-11 font-semibold text-rojo-texto underline"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => setBorrar(v.id)}
                          className="min-h-11 font-semibold text-gris-600 underline"
                        >
                          Eliminar
                        </button>
                      </div>
                    )
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
