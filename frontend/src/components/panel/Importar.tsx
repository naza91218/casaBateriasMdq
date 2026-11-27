'use client';

import type { InformeImportacion, TipoImportacion } from '@casa/shared';
import { FileSpreadsheet, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { enviar, ErrorApi } from '@/lib/api';
import { Aviso, Tarjeta } from './Formulario';

/** Importar planillas CSV (contracts/importacion-csv.md) y mostrar el informe fila por fila. */
export function Importar() {
  const router = useRouter();
  const [tipo, setTipo] = useState<TipoImportacion>('productos');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [informe, setInforme] = useState<InformeImportacion | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function subir(e: FormEvent) {
    e.preventDefault();
    if (!archivo) return setError('Elegí la planilla (archivo CSV).');
    const datos = new FormData();
    datos.append('tipo', tipo);
    datos.append('archivo', archivo);
    setEnviando(true);
    setError(null);
    setInforme(null);
    try {
      setInforme(await enviar<InformeImportacion>('/admin/importaciones', datos));
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ErrorApi && err.estado < 500
          ? (Object.values(err.campos)[0] ?? err.message)
          : 'No se pudo importar. Probá de nuevo.',
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex max-w-[900px] flex-col gap-5">
      <Tarjeta titulo="Subir planilla">
        <form onSubmit={subir} className="flex flex-col gap-4">
          <fieldset>
            <legend className="text-[17px] font-bold">¿Qué tiene la planilla?</legend>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              {(
                [
                  [
                    'productos',
                    'Productos',
                    'Código, nombre, marca, medida, precio, stock. Lo nuevo entra «a revisar».',
                  ],
                  [
                    'compatibilidades',
                    'Autos compatibles',
                    'Marca, modelo, años, motor y medidas que lleva cada auto.',
                  ],
                ] as const
              ).map(([v, t, d]) => (
                <label
                  key={v}
                  className={`flex cursor-pointer flex-col rounded-md border-2 p-4 has-focus-visible:outline-3 has-focus-visible:outline-negro ${tipo === v ? 'border-negro' : 'border-gris-300'}`}
                >
                  <input
                    type="radio"
                    name="tipo"
                    value={v}
                    checked={tipo === v}
                    onChange={() => setTipo(v)}
                    className="sr-only"
                  />
                  <span className="font-bold">{t}</span>
                  <span className="text-[15px] text-gris-600">{d}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div>
            <input
              id="planilla"
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
              className="sr-only"
            />
            <label
              htmlFor="planilla"
              className="flex min-h-14 cursor-pointer items-center gap-3 rounded-sm border-2 border-dashed border-gris-400 bg-blanco px-4 font-semibold hover:border-negro"
            >
              <FileSpreadsheet aria-hidden size={22} />
              {archivo ? archivo.name : 'Elegir archivo CSV (hasta 5 MB y 5.000 filas)'}
            </label>
            <p className="mt-1.5 text-[15px] text-gris-600">
              Desde Excel: Guardar como › CSV UTF-8 (delimitado por comas).
            </p>
          </div>
          {error && <Aviso tipo="error">{error}</Aviso>}
          <button
            type="submit"
            disabled={enviando}
            className="boton boton-rojo w-full md:w-fit disabled:opacity-70"
          >
            <Upload aria-hidden size={22} />
            {enviando ? 'Importando…' : 'Importar'}
          </button>
        </form>
      </Tarjeta>

      {informe && (
        <Tarjeta titulo="Resultado">
          <dl className="num grid grid-cols-2 gap-3 md:grid-cols-4">
            {(
              [
                ['Filas', informe.filasTotal],
                ['Nuevos', informe.creados],
                ['Actualizados', informe.actualizados],
                ['Con error', informe.filasError],
              ] as const
            ).map(([k, n]) => (
              <div key={k} className="rounded-sm bg-gris-100 p-3">
                <dt className="text-[15px] text-gris-600">{k}</dt>
                <dd
                  className={`text-[28px] font-bold ${k === 'Con error' && n ? 'text-rojo-texto' : ''}`}
                >
                  {n}
                </dd>
              </div>
            ))}
          </dl>
          {informe.errores.length > 0 && (
            <>
              <h3 className="mt-5 font-bold">Filas con error (no se cargaron)</h3>
              <ul className="mt-2 max-h-[400px] divide-y divide-gris-200 overflow-y-auto border-y border-gris-200">
                {informe.errores.map((e, i) => (
                  <li key={i} className="py-2 text-[16px]">
                    <span className="num font-bold">Fila {e.fila}</span> · {e.campo}: {e.motivo}
                  </li>
                ))}
              </ul>
            </>
          )}
          {informe.creados > 0 && tipo === 'productos' && (
            <p className="mt-4">
              Los productos nuevos quedaron «a revisar»: publicalos desde Productos.
            </p>
          )}
        </Tarjeta>
      )}
    </div>
  );
}
