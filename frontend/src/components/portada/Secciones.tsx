import {
  Banknote,
  Check,
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

const contenedor = 'mx-auto max-w-[1200px] px-4 md:px-12';

const BENEFICIOS = [
  {
    icono: Truck,
    titulo: 'Colocación incluida',
    texto: 'Vamos a tu casa o al trabajo en Mar del Plata. O la retirás en el local.',
  },
  {
    icono: Gauge,
    titulo: 'Medición del alternador',
    texto: 'Revisamos que tu auto cargue bien la batería nueva, para que te dure.',
  },
  {
    icono: ShieldCheck,
    titulo: '12 meses de garantía',
    texto: 'Y si tenés un problema, sabés dónde encontrarnos.',
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
        <h2 id="beneficios-titulo" className="titular text-[38px] md:text-[56px]">
          Mucho más que una batería
        </h2>
        <ul className="mt-10 grid gap-x-10 gap-y-9 md:mt-12 md:grid-cols-4">
          {BENEFICIOS.map(({ icono: Icono, titulo, texto }) => (
            <li key={titulo}>
              <span className="grid size-14 place-items-center rounded-sm bg-rojo text-blanco">
                <Icono aria-hidden size={28} strokeWidth={2} />
              </span>
              <h3 className="mt-5 text-[22px] leading-tight font-bold">{titulo}</h3>
              <p className="mt-2 text-gris-600">{texto}</p>
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
  { nombre: 'Herbo' },
  { nombre: 'Volta' },
];

/** Prueba: las marcas nacionales que trabaja el local, con las fotos que hay. */
export function Marcas() {
  return (
    <section aria-labelledby="marcas-titulo" className="oscuro bg-negro py-16 text-blanco md:py-24">
      <div className={contenedor}>
        <div className="md:flex md:items-end md:justify-between md:gap-10">
          <h2 id="marcas-titulo" className="titular text-[38px] md:text-[56px]">
            Marcas <span className="text-naranja">nacionales</span>
          </h2>
          <p className="mt-3 max-w-[44ch] text-gris-300 md:mt-0">
            Trabajamos con fabricantes argentinos: repuestos y garantía sin vueltas.
          </p>
        </div>
        <ul className="mt-10 grid grid-cols-2 gap-3 md:mt-12 md:grid-cols-4 md:gap-5">
          {MARCAS.map(({ nombre, foto }) => (
            <li key={nombre} className="overflow-hidden rounded-md bg-gris-900">
              <div className="grid aspect-[4/3] place-items-center bg-blanco p-4">
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
                  <span className="flex flex-col items-center gap-2 text-center text-[15px] font-semibold text-gris-600">
                    <ImageIcon aria-hidden size={36} strokeWidth={1.5} />
                    [Foto {nombre}]
                  </span>
                )}
              </div>
              <p className="titular px-4 py-3 text-[26px] md:text-[30px]">{nombre}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const PASOS = [
  ['Buscás tu auto', 'Marca, modelo y año. No hace falta saber la medida.'],
  ['Elegís la batería', 'Te mostramos solo las que le sirven: económica o reforzada.'],
  ['Pagás como quieras', 'Mercado Pago, transferencia con descuento o efectivo al retirar.'],
  ['Te la colocamos', 'Vamos con la camioneta, la colocamos y medimos el alternador.'],
];

export function Pasos() {
  return (
    <section id="como-funciona" aria-labelledby="pasos-titulo" className="py-16 md:py-24">
      <div className={contenedor}>
        <h2 id="pasos-titulo" className="titular text-[38px] md:text-[56px]">
          Cómo funciona
        </h2>
        <ol className="relative mt-10 grid gap-8 md:pasos-linea md:mt-12 md:grid-cols-4 md:gap-10">
          {PASOS.map(([titulo, texto], i) => (
            <li key={titulo} className="flex gap-5 md:block">
              <span className="relative grid size-12 flex-none place-items-center rounded-sm bg-negro text-[22px] font-bold text-blanco shadow-[0_0_0_10px_var(--color-blanco)]">
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

const ECONOMICA = [
  'Autos chicos y medianos que andan por la ciudad',
  'Pocos accesorios eléctricos',
  'El mejor precio, con la misma garantía',
];
const REFORZADA = [
  'Frío, viajes y muchos arranques por día',
  'Autos con audio, GNC, alarma o muchos consumos',
  'Camionetas y utilitarios',
];

export function Gamas({ whatsappUrl }: { whatsappUrl: string }) {
  return (
    <section aria-labelledby="gamas-titulo" className="bg-gris-100 py-16 md:py-24">
      <div className={contenedor}>
        <h2 id="gamas-titulo" className="titular text-[38px] md:text-[56px]">
          ¿Económica o <span className="text-rojo-texto">reforzada</span>?
        </h2>
        <p className="mt-3 max-w-[60ch] text-gris-600">
          Las dos traen garantía y colocación. La diferencia está en cuánto le vas a exigir.
        </p>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <article className="rounded-md border-2 border-negro bg-blanco p-6 md:p-9">
            <h3>
              <span className="titular block text-[36px] md:text-[44px]">Económica</span>
              <span className="mt-1 block text-[21px] font-bold">
                Para el uso de todos los días
              </span>
            </h3>
            <Lista items={ECONOMICA} />
          </article>
          <article className="oscuro rounded-md bg-negro p-6 text-blanco md:p-9">
            <h3>
              <span className="titular block text-[36px] text-naranja md:text-[44px]">
                Reforzada
              </span>
              <span className="mt-1 block text-[21px] font-bold">Para exigirle más</span>
            </h3>
            <Lista items={REFORZADA} />
          </article>
        </div>
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

function Lista({ items }: { items: string[] }) {
  return (
    <ul className="mt-6 flex flex-col gap-3">
      {items.map((t) => (
        <li key={t} className="flex gap-3">
          <span className="mt-0.5 grid size-6 flex-none place-items-center rounded-sm bg-rojo text-blanco">
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
    <section id="historia" aria-labelledby="historia-titulo" className="rayos-rojo text-negro">
      <div
        className={`${contenedor} grid items-center gap-10 py-16 md:grid-cols-[1.1fr_1fr] md:gap-14 md:py-24`}
      >
        <div>
          <h2 id="historia-titulo" className="titular text-[52px] md:text-[88px]">
            45 años <span className="text-blanco">en el mercado</span>
          </h2>
          <p className="mt-6 max-w-[48ch] text-[19px] leading-relaxed">
            [Historia del local: cómo empezó, quién lo atiende hoy y por qué la gente vuelve. Texto
            a cargar por Juan.]
          </p>
          <Link href="/quienes-somos" className="boton boton-negro mt-8">
            Conocé nuestra historia
          </Link>
        </div>
        <figure className="grid aspect-[4/3] place-items-center rounded-md bg-negro text-center text-gris-400">
          <div>
            <ImageIcon aria-hidden size={48} strokeWidth={1.5} className="mx-auto" />
            <figcaption className="mt-3 font-semibold">[Foto del local o del equipo]</figcaption>
          </div>
        </figure>
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
          <strong className="text-rojo-texto">
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
    <section aria-labelledby="pagos-titulo" className="py-16 md:py-24">
      <div className={contenedor}>
        <h2 id="pagos-titulo" className="titular text-[38px] md:text-[56px]">
          Pagás como te quede cómodo
        </h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {medios.map(({ icono: Icono, titulo, texto }) => (
            <div key={titulo} className="flex gap-4 rounded-md border-2 border-gris-200 p-6">
              <Icono aria-hidden size={32} strokeWidth={2} className="flex-none text-rojo" />
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
export function Cierre({ whatsappUrl }: { whatsappUrl: string }) {
  return (
    <section aria-labelledby="cierre-titulo" className="oscuro rayos-negro text-blanco">
      <div
        className={`${contenedor} flex flex-col gap-8 py-16 md:flex-row md:items-center md:justify-between md:py-20`}
      >
        <div>
          <h2 id="cierre-titulo" className="titular text-[38px] md:text-[56px]">
            ¿No sabés qué batería <span className="text-naranja">lleva tu auto?</span>
          </h2>
          <p className="mt-3 max-w-[48ch] text-gris-300">
            Contanos marca, modelo y año y te decimos cuál le va, cuánto sale y cuándo te la
            llevamos.
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
    </section>
  );
}
