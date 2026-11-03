'use client';

import type { Cotizacion, Entrega, MedioPago, PedidoCreado } from '@casa/shared';
import { CircleAlert, Lock, MessageCircle, Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { enlaceWhatsapp, enviar, ErrorApi } from '@/lib/api';
import { cambiarCantidad, unidades, useCarrito, vaciar } from '@/lib/carrito';
import { pesos } from '@/lib/formato';

export type DatosCheckout = {
  zonas: { id: string; nombre: string; costoExtra: number }[];
  domicilio: string;
  horarios: string[];
  descuentoPct: number | null;
  whatsapp: string;
};

type Campo =
  'nombre' | 'dni' | 'telefono' | 'email' | 'calle' | 'numero' | 'referencias' | 'zonaId';
const ORDEN: Campo[] = ['nombre', 'dni', 'telefono', 'email', 'zonaId', 'calle', 'numero'];

/** "comprador.dni" → "dni"; "zonaId" → "zonaId". */
const campoDe = (ruta: string) => ruta.replace(/^comprador\./, '') as Campo;

export function Checkout({ datos }: { datos: DatosCheckout }) {
  const router = useRouter();
  const items = useCarrito();
  const [comprador, setComprador] = useState<Record<Campo, string>>({
    nombre: '',
    dni: '',
    telefono: '',
    email: '',
    calle: '',
    numero: '',
    referencias: '',
    zonaId: datos.zonas.length === 1 ? datos.zonas[0]!.id : '',
  });
  const [entrega, setEntrega] = useState<Entrega>('colocacion');
  const [medio, setMedio] = useState<MedioPago>('transferencia');
  const [cotizacion, setCotizacion] = useState<Cotizacion | null>(null);
  const [errorCotizar, setErrorCotizar] = useState<string | null>(null);
  const [errores, setErrores] = useState<Partial<Record<Campo, string>>>({});
  const [general, setGeneral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const refs = useRef<Partial<Record<Campo, HTMLElement | null>>>({});
  const generalRef = useRef<HTMLDivElement>(null);

  const zonaId = entrega === 'colocacion' ? comprador.zonaId || undefined : undefined;
  // El efectivo es solo para retirar en el local: si se pasa a colocación, se vuelve a transferencia.
  const medioValido: MedioPago =
    entrega === 'colocacion' && medio === 'efectivo' ? 'transferencia' : medio;
  const clave = JSON.stringify({ items, entrega, zonaId, medioValido });

  // El total siempre lo calcula el servidor (FR-019): acá solo se muestra.
  useEffect(() => {
    if (!items.length) return;
    const c = new AbortController();
    const t = setTimeout(() => {
      enviar<Cotizacion>(
        '/checkout/cotizar',
        {
          items: items.map(({ productoId, cantidad }) => ({ productoId, cantidad })),
          entrega,
          zonaId,
          medioPago: medioValido,
        },
        c.signal,
      )
        .then((r) => {
          setCotizacion(r);
          setErrorCotizar(null);
        })
        .catch((e: unknown) => {
          if (c.signal.aborted) return;
          setErrorCotizar(e instanceof ErrorApi && e.codigo !== 'VALIDACION' ? e.message : null);
        });
    }, 250);
    return () => {
      clearTimeout(t);
      c.abort();
    };
    // `clave` resume las dependencias que cambian el precio.
  }, [clave]);

  const set = (campo: Campo) => (valor: string) => {
    setComprador((c) => ({ ...c, [campo]: valor }));
    if (errores[campo]) setErrores((e) => ({ ...e, [campo]: undefined }));
  };

  async function confirmar(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setGeneral(null);
    try {
      const pedido = await enviar<PedidoCreado>('/pedidos', {
        items: items.map(({ productoId, cantidad }) => ({ productoId, cantidad })),
        entrega,
        zonaId,
        medioPago: medioValido,
        comprador: {
          nombre: comprador.nombre,
          dni: comprador.dni.replace(/\./g, ''),
          telefono: comprador.telefono,
          email: comprador.email,
          ...(entrega === 'colocacion'
            ? {
                calle: comprador.calle,
                numero: comprador.numero,
                referencias: comprador.referencias || undefined,
              }
            : {}),
        },
      });
      vaciar();
      if (pedido.pago.tipo === 'mercadopago' && pedido.pago.initPoint) {
        window.location.assign(pedido.pago.initPoint);
        return;
      }
      const u = new URL(pedido.urlSeguimiento);
      router.push(`${u.pathname}${u.search}`);
    } catch (err) {
      setEnviando(false);
      if (
        err instanceof ErrorApi &&
        err.codigo === 'VALIDACION' &&
        Object.keys(err.campos).length
      ) {
        const nuevos: Partial<Record<Campo, string>> = {};
        for (const [ruta, msj] of Object.entries(err.campos)) nuevos[campoDe(ruta)] = msj;
        setErrores(nuevos);
        const primero = ORDEN.find((c) => nuevos[c]);
        if (primero) refs.current[primero]?.focus();
        else setGeneral(err.message);
        return;
      }
      setGeneral(
        err instanceof ErrorApi && err.estado < 500
          ? err.message
          : 'No pudimos registrar tu pedido. Probá de nuevo en un momento o escribinos por WhatsApp.',
      );
      requestAnimationFrame(() => generalRef.current?.focus());
    }
  }

  if (!items.length) {
    return (
      <div className="mx-auto max-w-[1200px] px-4 py-14 md:px-12 md:py-20">
        <div className="max-w-[640px] rounded-md border-2 border-negro bg-blanco p-6 md:p-9">
          <ShoppingCart aria-hidden size={40} />
          <h1 className="titular mt-4 text-[38px] md:text-[48px]">Tu carrito está vacío</h1>
          <p className="mt-3">Buscá la batería de tu auto y agregala para comprarla.</p>
          <div className="mt-6 flex flex-col gap-3 md:flex-row">
            <Link href="/#buscador" className="boton boton-rojo">
              Buscar mi batería
            </Link>
            <Link href="/baterias" className="boton boton-borde">
              Ver todas las baterías
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const zona = datos.zonas.find((z) => z.id === comprador.zonaId);
  const mensajeWa = `Hola, quiero comprar ${items.map((i) => `${i.cantidad} × ${i.nombre}`).join(', ')}.`;

  return (
    <form
      onSubmit={confirmar}
      noValidate
      className="mx-auto max-w-[1200px] px-4 py-8 md:px-12 md:py-12"
    >
      <h1 className="titular text-[44px] md:text-[60px]">Terminá tu compra</h1>
      <p className="mt-2 text-gris-600">Sin crear cuenta. Te lleva un par de minutos.</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
        <div className="flex flex-col gap-6">
          <Bloque n={1} titulo="Tus datos">
            <div className="grid gap-5 md:grid-cols-2">
              <Texto
                id="nombre"
                rotulo="Nombre y apellido"
                ayuda="Para saber a quién le entregamos."
                valor={comprador.nombre}
                cambiar={set('nombre')}
                error={errores.nombre}
                autoComplete="name"
                refs={refs}
              />
              <Texto
                id="dni"
                rotulo="DNI"
                ayuda="Para identificarte al entregarla. Solo números, sin puntos."
                valor={comprador.dni}
                cambiar={set('dni')}
                error={errores.dni}
                inputMode="numeric"
                refs={refs}
              />
              <Texto
                id="telefono"
                rotulo="Teléfono"
                ayuda="Con código de área. Te llamamos para coordinar."
                valor={comprador.telefono}
                cambiar={set('telefono')}
                error={errores.telefono}
                type="tel"
                autoComplete="tel"
                refs={refs}
              />
              <Texto
                id="email"
                rotulo="Mail"
                ayuda="Te mandamos el estado de tu pedido."
                valor={comprador.email}
                cambiar={set('email')}
                error={errores.email}
                type="email"
                autoComplete="email"
                refs={refs}
              />
            </div>
          </Bloque>

          <Bloque n={2} titulo="¿Dónde la querés?">
            <fieldset>
              <legend className="sr-only">Entrega</legend>
              <div className="grid gap-3 md:grid-cols-2">
                <Opcion
                  nombre="entrega"
                  marcada={entrega === 'colocacion'}
                  elegir={() => setEntrega('colocacion')}
                  titulo="Colocación a domicilio"
                  detalle="Vamos con la camioneta, la colocamos y medimos el alternador. Incluida."
                />
                <Opcion
                  nombre="entrega"
                  marcada={entrega === 'retiro'}
                  elegir={() => setEntrega('retiro')}
                  titulo="Retiro en el local"
                  detalle={`${datos.domicilio}. ${datos.horarios.join(' · ') || '[Horarios de atención]'}`}
                />
              </div>
            </fieldset>

            {entrega === 'colocacion' && (
              <div className="mt-6 grid gap-5 md:grid-cols-[1fr_140px]">
                <div className="md:col-span-2">
                  <Etiqueta id="zonaId" rotulo="Zona" ayuda="Dónde va a estar el auto." />
                  <select
                    id="zonaId"
                    ref={(el) => {
                      refs.current.zonaId = el;
                    }}
                    value={comprador.zonaId}
                    onChange={(e) => set('zonaId')(e.target.value)}
                    aria-invalid={Boolean(errores.zonaId)}
                    aria-describedby={errores.zonaId ? 'zonaId-error' : 'zonaId-ayuda'}
                    className="selector mt-2"
                    data-error={errores.zonaId ? true : undefined}
                  >
                    <option value="">Elegí tu zona</option>
                    {datos.zonas.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.nombre}
                        {z.costoExtra ? ` (+${pesos(z.costoExtra)})` : ''}
                      </option>
                    ))}
                  </select>
                  <ErrorCampo id="zonaId" error={errores.zonaId} />
                </div>
                <Texto
                  id="calle"
                  rotulo="Calle"
                  valor={comprador.calle}
                  cambiar={set('calle')}
                  error={errores.calle}
                  autoComplete="address-line1"
                  refs={refs}
                />
                <Texto
                  id="numero"
                  rotulo="Número"
                  valor={comprador.numero}
                  cambiar={set('numero')}
                  error={errores.numero}
                  inputMode="numeric"
                  refs={refs}
                />
                <div className="md:col-span-2">
                  <Texto
                    id="referencias"
                    rotulo="Referencias (opcional)"
                    ayuda="Entre calles, color de la casa, piso o departamento."
                    valor={comprador.referencias}
                    cambiar={set('referencias')}
                    error={errores.referencias}
                    refs={refs}
                  />
                </div>
              </div>
            )}
          </Bloque>

          <Bloque n={3} titulo="¿Cómo pagás?">
            <fieldset>
              <legend className="sr-only">Medio de pago</legend>
              <div className="grid gap-3">
                <Opcion
                  nombre="medio"
                  marcada={medioValido === 'transferencia'}
                  elegir={() => setMedio('transferencia')}
                  titulo={`Transferencia${datos.descuentoPct ? ` · ahorrás ${datos.descuentoPct} %` : ''}`}
                  detalle="Te mostramos los datos bancarios al confirmar. Tenés 48 horas para transferir."
                />
                <Opcion
                  nombre="medio"
                  marcada={medioValido === 'mercadopago'}
                  elegir={() => setMedio('mercadopago')}
                  titulo="Mercado Pago"
                  detalle="Tarjeta de crédito, débito o dinero en cuenta."
                />
                <Opcion
                  nombre="medio"
                  marcada={medioValido === 'efectivo'}
                  elegir={() => setMedio('efectivo')}
                  deshabilitada={entrega === 'colocacion'}
                  titulo={`Efectivo al retirar${datos.descuentoPct ? ` · ahorrás ${datos.descuentoPct} %` : ''}`}
                  detalle={
                    entrega === 'colocacion'
                      ? 'Solo si la retirás en el local.'
                      : 'Pagás en el local cuando la venís a buscar. Te la guardamos 7 días.'
                  }
                />
              </div>
            </fieldset>
          </Bloque>
        </div>

        {/* Resumen: lo que se compra y el total que calculó el servidor. */}
        <aside
          aria-labelledby="resumen-titulo"
          className="rounded-md border-2 border-negro bg-blanco p-5 md:p-6 lg:sticky lg:top-24"
        >
          <h2 id="resumen-titulo" className="titular text-[30px]">
            Tu compra
          </h2>
          <ul className="mt-4 divide-y divide-gris-200 border-y border-gris-200">
            {items.map((i) => {
              const c = cotizacion?.items.find((x) => x.productoId === i.productoId);
              return (
                <li key={i.productoId} className="py-4">
                  <div className="flex justify-between gap-3">
                    <Link
                      href={`/producto/${i.slug}`}
                      className="font-bold no-underline hover:underline"
                    >
                      {i.nombre}
                    </Link>
                    <span className="num font-semibold">{c ? pesos(c.subtotal) : '…'}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Cantidad
                      cantidad={i.cantidad}
                      nombre={i.nombre}
                      puedeSumar={unidades(items) < 10}
                      cambiar={(n) => cambiarCantidad(i.productoId, n)}
                    />
                    <button
                      type="button"
                      onClick={() => cambiarCantidad(i.productoId, 0)}
                      className="ml-auto inline-flex min-h-11 items-center gap-1.5 rounded-sm px-2 font-semibold text-rojo-texto hover:text-negro"
                    >
                      <Trash2 aria-hidden size={18} />
                      Quitar
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          {cotizacion && (
            <dl className="num mt-4 flex flex-col gap-2" aria-live="polite">
              <Fila k="Subtotal" v={pesos(cotizacion.subtotal)} />
              {cotizacion.descuento > 0 && (
                <Fila
                  k={`Descuento (${cotizacion.descuentoPct} %)`}
                  v={`−${pesos(cotizacion.descuento)}`}
                  rojo
                />
              )}
              {entrega === 'colocacion' && (
                <Fila
                  k={`Colocación${zona ? ` en ${zona.nombre}` : ''}`}
                  v={cotizacion.costoZona ? pesos(cotizacion.costoZona) : 'Incluida'}
                />
              )}
              <div className="mt-2 flex items-baseline justify-between border-t-2 border-negro pt-3">
                <dt className="text-[20px] font-bold">Total</dt>
                <dd className="text-[30px] font-bold">{pesos(cotizacion.total)}</dd>
              </div>
            </dl>
          )}
          {errorCotizar && (
            <p role="alert" className="mt-4 flex gap-2 font-semibold text-rojo-texto">
              <CircleAlert aria-hidden size={20} className="mt-0.5 flex-none" />
              {errorCotizar}
            </p>
          )}

          {general && (
            <div
              ref={generalRef}
              tabIndex={-1}
              role="alert"
              className="mt-5 rounded-sm border-2 border-rojo-texto p-4 font-semibold text-rojo-texto outline-none"
            >
              {general}
            </div>
          )}

          <button
            type="submit"
            disabled={enviando || Boolean(errorCotizar)}
            className="boton boton-rojo mt-5 w-full disabled:cursor-wait disabled:opacity-70"
          >
            <Lock aria-hidden size={20} />
            {enviando
              ? 'Registrando tu pedido…'
              : medioValido === 'mercadopago'
                ? 'Confirmar e ir a pagar'
                : 'Confirmar compra'}
          </button>
          <p className="mt-3 text-[15px] text-gris-600">
            Usamos tus datos solo para esta compra.{' '}
            <Link href="/legales/privacidad" className="underline hover:text-negro">
              Política de privacidad
            </Link>
            .
          </p>
          <a
            href={enlaceWhatsapp(datos.whatsapp, mensajeWa)}
            className="mt-4 inline-flex min-h-11 items-center gap-2 font-semibold text-rojo-texto underline hover:text-negro"
          >
            <MessageCircle aria-hidden size={20} />
            ¿Preferís comprar por WhatsApp?
          </a>
        </aside>
      </div>
    </form>
  );
}

function Bloque({ n, titulo, children }: { n: number; titulo: string; children: ReactNode }) {
  return (
    <section
      aria-labelledby={`bloque-${n}`}
      className="rounded-md border-2 border-gris-200 bg-blanco p-5 md:p-7"
    >
      <h2 id={`bloque-${n}`} className="mb-5 flex items-center gap-3 text-[24px] font-bold">
        <span
          aria-hidden
          className="grid size-9 place-items-center rounded-sm bg-negro text-[18px] text-blanco"
        >
          {n}
        </span>
        {titulo}
      </h2>
      {children}
    </section>
  );
}

function Etiqueta({ id, rotulo, ayuda }: { id: string; rotulo: string; ayuda?: string }) {
  return (
    <>
      <label htmlFor={id} className="block text-[17px] font-bold">
        {rotulo}
      </label>
      {ayuda && (
        <p id={`${id}-ayuda`} className="mt-0.5 text-[16px] text-gris-600">
          {ayuda}
        </p>
      )}
    </>
  );
}

function ErrorCampo({ id, error }: { id: string; error?: string }) {
  if (!error) return null;
  return (
    <p id={`${id}-error`} className="mt-1.5 flex gap-1.5 text-[16px] font-semibold text-rojo-texto">
      <CircleAlert aria-hidden size={18} className="mt-0.5 flex-none" />
      {error}
    </p>
  );
}

function Texto({
  id,
  rotulo,
  ayuda,
  valor,
  cambiar,
  error,
  refs,
  type = 'text',
  inputMode,
  autoComplete,
}: {
  id: Campo;
  rotulo: string;
  ayuda?: string;
  valor: string;
  cambiar: (v: string) => void;
  error?: string;
  refs: React.RefObject<Partial<Record<Campo, HTMLElement | null>>>;
  type?: string;
  inputMode?: 'numeric' | 'tel' | 'email';
  autoComplete?: string;
}) {
  return (
    <div>
      <Etiqueta id={id} rotulo={rotulo} ayuda={ayuda} />
      <input
        id={id}
        ref={(el) => {
          refs.current[id] = el;
        }}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        value={valor}
        onChange={(e) => cambiar(e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : ayuda ? `${id}-ayuda` : undefined}
        className={`mt-2 h-[60px] w-full rounded-sm border-2 bg-blanco px-4 text-[18px] font-semibold transition-colors duration-150 focus-visible:border-negro focus-visible:outline-none ${error ? 'border-rojo-texto' : 'border-gris-300 hover:border-gris-600'}`}
      />
      <ErrorCampo id={id} error={error} />
    </div>
  );
}

function Opcion({
  nombre,
  marcada,
  elegir,
  titulo,
  detalle,
  deshabilitada = false,
}: {
  nombre: string;
  marcada: boolean;
  elegir: () => void;
  titulo: string;
  detalle: string;
  deshabilitada?: boolean;
}) {
  return (
    <label
      className={`flex gap-4 rounded-md border-2 p-4 transition-colors duration-150 has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-negro ${deshabilitada ? 'cursor-not-allowed border-gris-200 bg-gris-100 text-gris-600' : marcada ? 'cursor-pointer border-negro bg-blanco' : 'cursor-pointer border-gris-300 bg-blanco hover:border-gris-600'}`}
    >
      <input
        type="radio"
        name={nombre}
        checked={marcada}
        onChange={elegir}
        disabled={deshabilitada}
        className="sr-only"
      />
      <span
        aria-hidden
        className={`mt-0.5 grid size-6 flex-none place-items-center rounded-full border-2 ${marcada ? 'border-negro' : 'border-gris-400'}`}
      >
        {marcada && <span className="size-3 rounded-full bg-rojo" />}
      </span>
      <span>
        <span className="block text-[19px] font-bold">{titulo}</span>
        <span className="mt-0.5 block text-[16px] text-gris-600">{detalle}</span>
      </span>
    </label>
  );
}

function Cantidad({
  cantidad,
  nombre,
  puedeSumar,
  cambiar,
}: {
  cantidad: number;
  nombre: string;
  puedeSumar: boolean;
  cambiar: (n: number) => void;
}) {
  return (
    <div
      className="flex h-11 items-center rounded-sm border-2 border-gris-300"
      role="group"
      aria-label={`Cantidad de ${nombre}`}
    >
      <button
        type="button"
        onClick={() => cambiar(cantidad - 1)}
        disabled={cantidad <= 1}
        aria-label="Una menos"
        className="grid size-10 place-items-center disabled:text-gris-400"
      >
        <Minus aria-hidden size={18} />
      </button>
      <output className="num w-8 text-center font-bold">{cantidad}</output>
      <button
        type="button"
        onClick={() => cambiar(cantidad + 1)}
        disabled={!puedeSumar}
        aria-label="Una más"
        className="grid size-10 place-items-center disabled:text-gris-400"
      >
        <Plus aria-hidden size={18} />
      </button>
    </div>
  );
}

function Fila({ k, v, rojo = false }: { k: string; v: string; rojo?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-gris-600">{k}</dt>
      <dd className={`font-semibold ${rojo ? 'text-rojo-texto' : ''}`}>{v}</dd>
    </div>
  );
}
