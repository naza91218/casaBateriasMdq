'use client';

import type { OpcionVehiculo } from '@casa/shared';
import { CircleAlert, MessageCircle, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { api, enlaceWhatsapp } from '@/lib/api';

type Carga<T> =
  | { estado: 'vacio' }
  | { estado: 'cargando' }
  | { estado: 'error' }
  | { estado: 'listo'; datos: T };

/**
 * Buscador por auto (FR-009, FR-010): marca → modelo → año. Si el modelo no distingue años,
 * con el modelo alcanza. La batería se carga una celda por paso.
 */
export function Buscador({
  marcas,
  whatsapp,
}: {
  marcas: OpcionVehiculo[] | null;
  whatsapp: string;
}) {
  const router = useRouter();
  const id = useId();
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [anio, setAnio] = useState('');
  const [modelos, setModelos] = useState<Carga<OpcionVehiculo[]>>({ estado: 'vacio' });
  const [anios, setAnios] = useState<Carga<number[]>>({ estado: 'vacio' });
  const [falta, setFalta] = useState<string | null>(null);
  const [reintento, setReintento] = useState(0);
  const refs = {
    marca: useRef<HTMLSelectElement>(null),
    modelo: useRef<HTMLSelectElement>(null),
    anio: useRef<HTMLSelectElement>(null),
  };

  // Los estados "cargando" y "vacío" se fijan al elegir; los efectos solo traen las listas.
  useEffect(() => {
    if (!marca) return;
    const c = new AbortController();
    api
      .modelos(marca, c.signal)
      .then((datos) => setModelos({ estado: 'listo', datos }))
      .catch(() => !c.signal.aborted && setModelos({ estado: 'error' }));
    return () => c.abort();
  }, [marca, reintento]);

  useEffect(() => {
    if (!marca || !modelo) return;
    const c = new AbortController();
    api
      .anios(marca, modelo, c.signal)
      .then((datos) => setAnios({ estado: 'listo', datos }))
      .catch(() => !c.signal.aborted && setAnios({ estado: 'error' }));
    return () => c.abort();
  }, [marca, modelo, reintento]);

  function reintentar() {
    if (modelos.estado === 'error') setModelos({ estado: 'cargando' });
    if (anios.estado === 'error') setAnios({ estado: 'cargando' });
    setReintento((n) => n + 1);
  }

  const sinAnios = anios.estado === 'listo' && anios.datos.length === 0;
  const completo = Boolean(marca && modelo && (anio || sinAnios));
  const nombre = (lista: Carga<OpcionVehiculo[]> | OpcionVehiculo[] | null, slug: string) =>
    (Array.isArray(lista) ? lista : lista?.estado === 'listo' ? lista.datos : [])?.find(
      (o) => o.slug === slug,
    )?.nombre ?? '';
  const auto = [nombre(marcas, marca), nombre(modelos, modelo), anio].filter(Boolean).join(' ');

  const sinMarcas = marcas === null;
  const hayError = sinMarcas || modelos.estado === 'error' || anios.estado === 'error';
  const estado = sinMarcas
    ? 'No pudimos cargar las marcas. Te buscamos la batería por WhatsApp.'
    : hayError
      ? 'No pudimos cargar la lista. Revisá tu conexión.'
      : !marca
        ? 'Paso 1 de 3: elegí la marca'
        : !modelo
          ? 'Paso 2 de 3: elegí el modelo'
          : anios.estado === 'cargando'
            ? 'Buscando los años…'
            : !completo
              ? 'Paso 3 de 3: elegí el año'
              : `Listo: ${auto}`;

  function buscar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const pendiente = !marca ? 'marca' : !modelo ? 'modelo' : !completo ? 'anio' : null;
    if (pendiente) {
      setFalta(pendiente);
      refs[pendiente].current?.focus();
      return;
    }
    const q = new URLSearchParams({ marca, modelo, ...(anio ? { anio } : {}) });
    router.push(`/buscar?${q}`);
  }

  const mensaje = auto
    ? `Hola, no encuentro la batería para mi ${auto}.`
    : sinMarcas
      ? 'Hola, quiero una batería para mi auto. Es un…'
      : 'Hola, no encuentro mi auto en el buscador.';

  return (
    <form
      id="buscador"
      onSubmit={buscar}
      noValidate
      aria-labelledby={`${id}-titulo`}
      className="relative mx-auto w-full max-w-[1104px] rounded-md border-2 border-negro bg-blanco px-4 py-6 md:px-8 md:py-8"
    >
      <h2 id={`${id}-titulo`} className="titular text-[38px] md:text-[52px]">
        Buscá la batería de tu auto
      </h2>
      <p className="mt-2 max-w-[60ch] text-gris-600">
        No hace falta saber la medida: elegí marca, modelo y año y te mostramos solo las que le
        sirven.
      </p>
      <div className="mt-5 mb-5 flex items-center gap-4 border-t-2 border-gris-200 pt-5">
        <div
          className="bateria"
          role="img"
          aria-label={`Búsqueda: ${[marca, modelo, completo].filter(Boolean).length} de 3 pasos`}
        >
          <span className="celda" data-cargada={Boolean(marca)} />
          <span className="celda" data-cargada={Boolean(modelo)} />
          <span className="celda" data-cargada={completo} />
        </div>
        <div className="ml-1 min-w-0">
          <p
            aria-live="polite"
            className={`text-[17px] leading-snug ${hayError ? 'font-semibold text-rojo-texto' : 'font-semibold text-negro'}`}
          >
            {hayError && (
              <CircleAlert
                aria-hidden
                size={18}
                strokeWidth={2.25}
                className="mr-1.5 inline-block -translate-y-px align-middle"
              />
            )}
            {estado}
            {hayError && (
              <>
                {' '}
                <button
                  type="button"
                  onClick={() => (sinMarcas ? router.refresh() : reintentar())}
                  className="rounded-sm font-bold underline hover:text-negro"
                >
                  Probar de nuevo
                </button>
              </>
            )}
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[repeat(3,minmax(0,1fr))_auto] md:items-end">
        <Campo
          id={`${id}-marca`}
          paso={1}
          rotulo="Marca"
          error={falta === 'marca' && !marca ? 'Elegí la marca de tu auto' : null}
        >
          <select
            ref={refs.marca}
            id={`${id}-marca`}
            name="marca"
            className="selector"
            value={marca}
            disabled={!marcas?.length}
            onChange={(e) => {
              setMarca(e.target.value);
              setModelo('');
              setAnio('');
              setModelos({ estado: e.target.value ? 'cargando' : 'vacio' });
              setAnios({ estado: 'vacio' });
              setFalta(null);
            }}
          >
            <option value="">{marcas === null ? 'No disponible' : 'Elegí la marca'}</option>
            {marcas?.map((m) => (
              <option key={m.slug} value={m.slug}>
                {m.nombre}
              </option>
            ))}
          </select>
        </Campo>

        <Campo
          id={`${id}-modelo`}
          paso={2}
          rotulo="Modelo"
          error={falta === 'modelo' && !modelo ? 'Elegí el modelo' : null}
        >
          <select
            ref={refs.modelo}
            id={`${id}-modelo`}
            name="modelo"
            className="selector"
            value={modelo}
            disabled={modelos.estado !== 'listo'}
            onChange={(e) => {
              setModelo(e.target.value);
              setAnio('');
              setAnios({ estado: e.target.value ? 'cargando' : 'vacio' });
              setFalta(null);
            }}
          >
            <option value="">
              {modelos.estado === 'cargando' ? 'Cargando modelos…' : 'Elegí el modelo'}
            </option>
            {modelos.estado === 'listo' &&
              modelos.datos.map((m) => (
                <option key={m.slug} value={m.slug}>
                  {m.nombre}
                </option>
              ))}
          </select>
        </Campo>

        <Campo
          id={`${id}-anio`}
          paso={3}
          rotulo="Año"
          error={falta === 'anio' && !completo ? 'Elegí el año' : null}
        >
          <select
            ref={refs.anio}
            id={`${id}-anio`}
            name="anio"
            className="selector num"
            value={anio}
            disabled={anios.estado !== 'listo' || sinAnios}
            onChange={(e) => {
              setAnio(e.target.value);
              setFalta(null);
            }}
          >
            <option value="">
              {sinAnios
                ? 'Todos los años'
                : anios.estado === 'cargando'
                  ? 'Cargando años…'
                  : 'Elegí el año'}
            </option>
            {anios.estado === 'listo' &&
              anios.datos.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
          </select>
        </Campo>

        {sinMarcas ? (
          // Sin buscador no hay callejón sin salida: la acción pasa a ser pedirla por WhatsApp.
          <a
            href={enlaceWhatsapp(whatsapp, mensaje)}
            className="boton boton-negro mt-1 w-full md:mt-0 md:w-auto"
          >
            <MessageCircle aria-hidden size={24} strokeWidth={2} />
            Pedí tu batería por WhatsApp
          </a>
        ) : (
          <button type="submit" className="boton boton-rojo mt-1 w-full md:mt-0 md:w-auto">
            <Zap aria-hidden size={24} strokeWidth={2} />
            Ver baterías
          </button>
        )}
      </div>

      {!sinMarcas && (
        <p className="mt-5 text-[17px] leading-snug font-semibold">
          ¿No encontrás tu auto?{' '}
          <a
            className="rounded-sm text-rojo-texto underline hover:text-negro"
            href={enlaceWhatsapp(whatsapp, mensaje)}
          >
            Escribinos por WhatsApp
          </a>
        </p>
      )}
    </form>
  );
}

function Campo({
  id,
  paso,
  rotulo,
  error,
  children,
}: {
  id: string;
  paso: number;
  rotulo: string;
  error: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2" data-error={error ? true : undefined}>
      <label htmlFor={id} className="flex items-center gap-2.5 text-[17px] leading-tight font-bold">
        <span
          aria-hidden
          className="grid size-7 flex-none place-items-center rounded-sm bg-negro text-[15px] text-blanco"
        >
          {paso}
        </span>
        {rotulo}
      </label>
      {children}
      {error && (
        <p role="alert" className="text-[16px] font-semibold text-rojo-texto">
          {error}
        </p>
      )}
    </div>
  );
}
