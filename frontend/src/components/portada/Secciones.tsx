import {
  ArrowRight,
  Banknote,
  Check,
  Clock,
  CreditCard,
  Gauge,
  ImageIcon,
  Landmark,
  MessageCircle,
  ShieldCheck,
  Truck,
  Wrench,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Palabras } from '@/components/Palabras';
import type { CSSProperties } from 'react';
import { FotosLocal } from '@/components/FotosLocal';

const contenedor = 'mx-auto max-w-[1200px] px-4 md:px-12';

const BENEFICIOS = [
  {
    icono: Truck,
    titulo: 'Colocación incluida',
    texto: 'Vamos a tu casa o a donde estés en Mar del Plata, o la retirás en nuestro local.',
  },
  {
    icono: Gauge,
    titulo: 'Medición del alternador',
    texto: 'Revisamos que el alternador de tu auto cargue bien la batería nueva ya colocada.',
  },
  {
    icono: ShieldCheck,
    titulo: 'Garantía de hasta 18 meses',
    texto:
      '18 meses en baterías Sermat y 12 en las demás marcas. Ante cualquier inconveniente, te atendemos en nuestro local.',
  },
  {
    icono: Wrench,
    titulo: 'Te asesoramos',
    texto: 'Si no sabés cuál lleva tu auto, escribinos y te decimos.',
  },
];

/** Franja de beneficios: el servicio es el diferencial y va apenas debajo del buscador. */
export function Beneficios() {
  return (
    <section aria-labelledby="beneficios-titulo" className="py-16 md:py-24">
      <div className={contenedor}>
        <h2 id="beneficios-titulo" className="en-vista titular text-[38px] md:text-[56px]">
          <Palabras texto="Mucho más que una batería" />
        </h2>
        <ul className="aparece mt-10 grid gap-x-10 gap-y-9 md:mt-12 md:grid-cols-4">
          {BENEFICIOS.map(({ icono: Icono, titulo, texto }) => (
            <li key={titulo} className="border-t-2 border-negro pt-5">
              <h3 className="flex items-center gap-3 text-[22px] leading-tight font-bold">
                <Icono aria-hidden size={30} strokeWidth={2} className="flex-none" />
                {titulo}
              </h3>
              <p className="mt-2.5 text-gris-600">{texto}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const MARCAS: { nombre: string; foto?: { src: string; ancho: number; alto: number } }[] = [
  { nombre: 'Sermat', foto: { src: '/baterias/sermat-12x65.webp', ancho: 656, alto: 621 } },
  { nombre: 'Edna', foto: { src: '/baterias/edna.webp', ancho: 777, alto: 732 } },
  { nombre: 'Herbo', foto: { src: '/baterias/herbo.webp', ancho: 396, alto: 347 } },
  { nombre: 'Volta' },
];

/** Prueba: las marcas nacionales que trabaja el local, con las fotos que hay. */
export function Marcas() {
  return (
    <section
      aria-labelledby="marcas-titulo"
      className="oscuro rayos-fundido hero-foco py-16 text-blanco md:py-24"
    >
      <div className={contenedor}>
        <div className="md:flex md:items-end md:justify-between md:gap-10">
          <h2 id="marcas-titulo" className="en-vista titular text-[38px] md:text-[56px]">
            <Palabras texto="Marcas" />{' '}
            <Palabras texto="nacionales" desde={1} className="text-naranja" />
          </h2>
          <p className="mt-3 max-w-[44ch] text-gris-300 md:mt-0">
            Trabajamos con fabricantes argentinos: repuestos y garantía sin vueltas.
          </p>
        </div>
        <ul className="aparece mt-10 grid grid-cols-2 gap-3 md:mt-12 md:grid-cols-4 md:gap-5">
          {MARCAS.map(({ nombre, foto }) => (
            <li key={nombre}>
              <Link
                href={`/baterias?marca=${nombre.toLowerCase()}`}
                className="tarjeta-marca block h-full rounded-[20px]"
              >
                <div className="grid aspect-[4/3] place-items-center p-3">
                  {foto ? (
                    <Image
                      src={foto.src}
                      alt={`Batería ${nombre}`}
                      width={foto.ancho}
                      height={foto.alto}
                      sizes="(width >= 860px) 260px, 45vw"
                      className="h-full w-auto object-contain"
                    />
                  ) : (
                    <span className="flex flex-col items-center gap-2 text-center text-[15px] font-semibold text-gris-400">
                      <ImageIcon aria-hidden size={36} strokeWidth={1.5} />
                      [Foto {nombre}]
                    </span>
                  )}
                </div>
                <p className="etiqueta flex flex-wrap items-center justify-between gap-x-3 !rounded-[12px] px-4 py-3">
                  <span className="titular text-[26px] md:text-[30px]">{nombre}</span>
                  <span className="flecha flex items-center gap-1 text-[15px] font-semibold text-rojo-texto">
                    Ver baterías <ArrowRight aria-hidden size={18} strokeWidth={2.5} />
                  </span>
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const PASOS = [
  ['Buscás tu auto', 'Marca, modelo y año. No hace falta saber la medida.'],
  ['Elegís la batería', 'Te mostramos la batería que lleva tu vehículo: económica o reforzada.'],
  ['Pagás como quieras', 'Mercado Pago, transferencia con descuento o efectivo al retirar.'],
  [
    'Te la colocamos',
    'Vamos a tu casa o a donde estés en Mar del Plata, la colocamos y medimos el alternador.',
  ],
];

export function Pasos() {
  return (
    <section id="como-funciona" aria-labelledby="pasos-titulo" className="py-16 md:py-24">
      <div className={contenedor}>
        <h2 id="pasos-titulo" className="en-vista titular text-[38px] md:text-[56px]">
          <Palabras texto="Cómo funciona" />
        </h2>
        <ol className="pasos relative mt-10 grid gap-8 md:pasos-linea md:mt-12 md:grid-cols-4 md:gap-10">
          {PASOS.map(([titulo, texto], i) => (
            <li key={titulo} className="flex gap-5 md:block">
              <span
                style={{ '--i': i } as CSSProperties}
                className="paso-num relative grid size-12 flex-none place-items-center rounded-sm bg-negro text-[22px] font-bold text-blanco shadow-[0_0_0_10px_var(--color-blanco)]"
              >
                {i + 1}
              </span>
              <div>
                <h3 className="text-[22px] leading-tight font-bold md:mt-6">{titulo}</h3>
                <p className="mt-2 text-gris-600">{texto}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

// Datos del abuelo de Mateo (2026-11-26): placas por vaso, peso, resistencia y vida útil.
const ECONOMICA = [
  'Autos de uso normal en la ciudad',
  'Arranca sin problemas en condiciones normales',
  'El mejor precio, con garantía y colocación',
];
const REFORZADA = [
  'Frío, viajes y muchos arranques por día',
  'Autos con audio, GNC, alarma o muchos consumos',
  'Aguanta mejor las descargas y las vibraciones',
];

export function Gamas({ whatsappUrl }: { whatsappUrl: string }) {
  return (
    <section aria-labelledby="gamas-titulo" className="bg-gris-100 py-16 md:py-24">
      <div className={contenedor}>
        <h2 id="gamas-titulo" className="en-vista titular text-[38px] md:text-[56px]">
          <Palabras texto="¿Económica o reforzada?" />
        </h2>
        <p className="mt-3 max-w-[60ch] text-gris-600">
          Las dos traen garantía y colocación. La diferencia está adentro: la reforzada lleva más
          placas por vaso, y eso define cuánto le vas a poder exigir y cuánto te va a durar.
        </p>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <article className="aparece etiqueta">
            <p aria-hidden className="etiqueta-banda h-3" />
            <div className="p-6 md:p-9">
              <h3>
                <span className="titular block text-[36px] md:text-[44px]">Económica</span>
                <span className="mt-1 block text-[21px] font-bold">
                  Para el uso de todos los días
                </span>
              </h3>
              <PorDentro anios="2 a 3" detalle="Menos placas por vaso, más liviana" />
              <Lista items={ECONOMICA} />
            </div>
          </article>
          <article className="aparece oscuro carcasa !rounded-[16px] p-6 md:p-9">
            <h3>
              <span className="titular block text-[36px] text-naranja md:text-[44px]">
                Reforzada
              </span>
              <span className="mt-1 block text-[21px] font-bold">Para exigirle más</span>
            </h3>
            <PorDentro anios="3 a 5" detalle="Más placas por vaso, según el uso" oscuro />
            <Lista items={REFORZADA} />
          </article>
        </div>
        <p className="mt-6 max-w-[64ch] text-gris-600">
          Más placas es más superficie para dar corriente en el arranque: por eso la reforzada es
          más pesada, más resistente y dura más.
        </p>
        <p className="mt-6 font-semibold">
          ¿No sabés cuál te conviene?{' '}
          <a className="rounded-sm text-rojo-texto underline hover:text-negro" href={whatsappUrl}>
            Te asesoramos por WhatsApp
          </a>
        </p>
      </div>
    </section>
  );
}

/** El dato que más pesa al elegir: cuántos años dura cada gama. */
function PorDentro({
  anios,
  detalle,
  oscuro = false,
}: {
  anios: string;
  detalle: string;
  oscuro?: boolean;
}) {
  return (
    <p
      className={`mt-6 flex items-baseline gap-3 border-y py-4 ${oscuro ? 'border-white/15' : 'border-gris-300'}`}
    >
      <span className="titular text-[48px] leading-none whitespace-nowrap md:text-[56px]">
        {anios}
      </span>
      <span className="leading-snug">
        <span className="block font-bold">años de vida útil</span>
        <span className={oscuro ? 'text-gris-300' : 'text-gris-600'}>{detalle}</span>
      </span>
    </p>
  );
}

function Lista({ items }: { items: string[] }) {
  return (
    <ul className="mt-6 flex flex-col gap-3">
      {items.map((t) => (
        <li key={t} className="flex gap-3">
          <span className="mt-0.5 grid size-6 flex-none place-items-center rounded-full bg-verde-ok text-blanco">
            <Check aria-hidden size={17} strokeWidth={3} />
          </span>
          {t}
        </li>
      ))}
    </ul>
  );
}

/** El único campo de color de la página: la historia del local, con el patrón de la marca. */
export function Historia() {
  return (
    <section
      id="historia"
      aria-labelledby="historia-titulo"
      className="rayos-fundido rayos-fundido-rojo text-negro"
    >
      <div
        className={`${contenedor} grid items-center gap-12 py-16 md:grid-cols-[1fr_1.35fr] md:gap-16 md:py-24`}
      >
        <div>
          <h2 id="historia-titulo" className="en-vista titular text-[52px] md:text-[88px]">
            <Palabras texto="45 años" />{' '}
            <Palabras texto="en el mercado" desde={2} className="text-blanco" />
          </h2>
          <p className="mt-6 max-w-[48ch] text-[19px] leading-relaxed">
            [Historia del local: cómo empezó, quién lo atiende hoy y por qué la gente vuelve. Texto
            a cargar por Mateo.]
          </p>
          <Link href="/quienes-somos" className="boton boton-negro mt-8">
            Conocé nuestra historia
          </Link>
        </div>
        <FotosLocal />
      </div>
    </section>
  );
}

export function Pagos({ descuentoPct }: { descuentoPct: number | null }) {
  const medios = [
    {
      icono: CreditCard,
      titulo: 'Mercado Pago',
      texto: <>Tarjeta de crédito, débito o dinero en cuenta.</>,
    },
    {
      icono: Landmark,
      titulo: 'Transferencia',
      texto: (
        <>
          Con{' '}
          <strong className="text-negro">
            <span className="num">{descuentoPct ?? '[X'}</span> %{descuentoPct === null ? ']' : ''}{' '}
            de descuento
          </strong>
          .
        </>
      ),
    },
    { icono: Banknote, titulo: 'Efectivo', texto: <>Al retirar en el local.</> },
  ];
  return (
    <section aria-labelledby="pagos-titulo" className="bg-gris-100 py-16 md:py-24">
      <div className={contenedor}>
        <h2 id="pagos-titulo" className="en-vista titular text-[38px] md:text-[56px]">
          <Palabras texto="Pagás como te quede cómodo" />
        </h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {medios.map(({ icono: Icono, titulo, texto }) => (
            <div key={titulo} className="etiqueta flex gap-4 p-6">
              <Icono aria-hidden size={32} strokeWidth={2} className="flex-none" />
              <div>
                <h3 className="text-[21px] leading-tight font-bold">{titulo}</h3>
                <p className="mt-1.5 text-gris-600">{texto}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Cierre: una última salida para quien todavía duda. */
export function Cierre({
  whatsappUrl,
  domicilio,
  horarios,
}: {
  whatsappUrl: string;
  domicilio: string;
  horarios: string[];
}) {
  return (
    <section aria-labelledby="cierre-titulo" className="hero-taller oscuro text-blanco">
      <div className={`${contenedor} relative pt-24 pb-16 md:pt-28 md:pb-20`}>
        <img
          src="/bateria/borne-positivo.svg"
          alt=""
          width={120}
          height={96}
          className="absolute top-[34px] left-[calc(8%+16px)] w-[70px] md:top-[30px] md:w-[96px]"
        />
        <div className="carcasa flex flex-col gap-8 p-6 md:flex-row md:items-center md:justify-between md:p-10">
          <div>
            <h2 id="cierre-titulo" className="en-vista titular text-[38px] md:text-[56px]">
              <Palabras texto="¿No sabés qué batería" />{' '}
              <Palabras texto="lleva tu auto?" desde={4} className="text-naranja" />
            </h2>
            <p className="mt-3 max-w-[48ch] text-gris-300">
              Contanos marca, modelo y año y te decimos cuál le va, cuánto sale y cuándo te la
              llevamos.
            </p>
            <p className="mt-5 flex gap-3 text-[17px]">
              <Clock
                aria-hidden
                size={22}
                strokeWidth={2}
                className="mt-0.5 flex-none text-plomo"
              />
              <span>
                <span className="font-bold">Atendemos</span>{' '}
                {horarios.length ? horarios.join(' · ') : '[Horarios de atención]'}
                <span className="block text-gris-300">{domicilio}</span>
              </span>
            </p>
          </div>
          <div className="flex flex-none flex-col gap-3 md:flex-row">
            <Link href="/#buscador" className="boton boton-rojo">
              Buscar mi batería
            </Link>
            <a href={whatsappUrl} className="boton boton-fantasma">
              <MessageCircle aria-hidden size={22} strokeWidth={2} />
              Escribinos
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
