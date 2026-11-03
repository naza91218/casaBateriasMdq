import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { datosTienda, type DatosTienda } from '@/lib/tienda';

/**
 * Términos, privacidad y cambios y garantía (FR-057). Es un borrador armado con los datos del
 * comercio: lo que va entre corchetes lo completa o revisa el abogado antes de publicar.
 */
type Seccion = { titulo: string; parrafos: string[] };
type Pagina = { titulo: string; descripcion: string; secciones: (d: DatosTienda) => Seccion[] };

const comercio = (d: DatosTienda) =>
  `${d.razonSocial ?? '[Razón social]'}, CUIT ${d.cuit ?? '[número]'}, con domicilio en ${d.domicilio}`;

const PAGINAS: Record<string, Pagina> = {
  terminos: {
    titulo: 'Términos y condiciones',
    descripcion: 'Cómo funcionan las compras en la tienda: precios, pagos, colocación y entrega.',
    secciones: (d) => [
      {
        titulo: 'Quién vende',
        parrafos: [
          `Esta tienda es de ${comercio(d)} («La Casa de las Baterías»). Al hacer un pedido aceptás estas condiciones.`,
        ],
      },
      {
        titulo: 'Precios y pagos',
        parrafos: [
          'Los precios están en pesos argentinos e incluyen IVA. Con transferencia o efectivo se aplica el descuento que se muestra en cada batería; con Mercado Pago se paga el precio de lista.',
          'Vale el precio que ves al confirmar el pedido. Si pagás por transferencia, tenés el plazo que te indicamos en el mail para pagar; si no se acredita, el pedido se cancela.',
        ],
      },
      {
        titulo: 'Colocación y entrega',
        parrafos: [
          'La colocación está incluida en el local y en Mar del Plata. Algunas zonas tienen un costo extra, que se muestra antes de confirmar.',
          'Al colocar la batería nueva retiramos la usada para su reciclado.',
        ],
      },
      {
        titulo: 'Stock',
        parrafos: [
          'El stock se confirma al hacer el pedido. Si por un error no tuviéramos la batería, te avisamos y te devolvemos lo pagado o te ofrecemos otra que le sirva a tu auto.',
        ],
      },
      {
        titulo: 'Arrepentimiento',
        parrafos: [
          'Tenés 10 días corridos desde que recibís la batería para arrepentirte de la compra, sin dar motivos (Ley 24.240, art. 34). Usá el botón de arrepentimiento del pie de la página.',
        ],
      },
      { titulo: 'Otros', parrafos: ['[Jurisdicción y demás cláusulas a revisar por el abogado.]'] },
    ],
  },
  privacidad: {
    titulo: 'Política de privacidad',
    descripcion: 'Qué datos pedimos al comprar, para qué los usamos y cómo pedir que los borremos.',
    secciones: (d) => [
      { titulo: 'Quién guarda tus datos', parrafos: [`El responsable es ${comercio(d)}.`] },
      {
        titulo: 'Qué datos pedimos y para qué',
        parrafos: [
          'Nombre, mail, teléfono, DNI y, si corresponde, la dirección de colocación. Los usamos solo para facturar, colocar la batería, avisarte cómo va tu pedido y atender la garantía.',
          'El DNI se guarda cifrado y no aparece en mails, enlaces ni mediciones. No vendemos ni compartimos tus datos, salvo con Mercado Pago cuando elegís pagar por ahí.',
        ],
      },
      {
        titulo: 'Mediciones',
        parrafos: [
          'Usamos Google Analytics y el píxel de Meta para saber qué páginas se visitan y qué campañas funcionan. No les mandamos tu nombre, mail, teléfono, DNI ni dirección.',
        ],
      },
      {
        titulo: 'Tus derechos',
        parrafos: [
          'Podés pedir ver, corregir o borrar tus datos escribiéndonos por WhatsApp (Ley 25.326). La Agencia de Acceso a la Información Pública es el órgano de control de esa ley.',
        ],
      },
    ],
  },
  garantia: {
    titulo: 'Cambios y garantía',
    descripcion: 'Garantía de 12 meses en todas las baterías y cómo hacer un cambio o un reclamo.',
    secciones: () => [
      {
        titulo: '12 meses de garantía',
        parrafos: [
          'Todas las baterías tienen 12 meses de garantía desde la colocación. Si falla, traela al local o escribinos: la probamos con el equipo y, si es una falla de fábrica, te la cambiamos.',
          'La garantía no cubre golpes, bornes dañados ni fallas por un problema del auto (alternador, consumos). [Condiciones de cada fabricante a confirmar.]',
        ],
      },
      {
        titulo: 'Cambios',
        parrafos: [
          'Si la batería no es la que tu auto necesita, la cambiamos por la correcta. Para arrepentirte dentro de los 10 días, usá el botón de arrepentimiento.',
        ],
      },
    ],
  },
};

type Props = { params: Promise<{ pagina: string }> };

export const dynamicParams = false;
export function generateStaticParams() {
  return Object.keys(PAGINAS).map((pagina) => ({ pagina }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = PAGINAS[(await params).pagina];
  return p ? { title: p.titulo, description: p.descripcion } : {};
}

export default async function Legal({ params }: Props) {
  const p = PAGINAS[(await params).pagina];
  if (!p) notFound();
  const d = await datosTienda();
  return (
    <article className="mx-auto max-w-[760px] px-4 py-12 md:px-12 md:py-16">
      <h1 className="titular text-[44px] md:text-[60px]">{p.titulo}</h1>
      {p.secciones(d).map((s) => (
        <section key={s.titulo} className="mt-8">
          <h2 className="text-[22px] font-bold">{s.titulo}</h2>
          {s.parrafos.map((t) => (
            <p key={t} className="mt-3 max-w-[68ch] leading-relaxed">
              {t}
            </p>
          ))}
        </section>
      ))}
      <p className="mt-10 border-t-2 border-gris-200 pt-6">
        ¿Querés arrepentirte de una compra?{' '}
        <Link href="/arrepentimiento" className="font-semibold text-rojo-texto underline">
          Botón de arrepentimiento
        </Link>
      </p>
    </article>
  );
}
