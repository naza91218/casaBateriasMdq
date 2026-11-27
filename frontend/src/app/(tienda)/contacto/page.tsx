import { Clock, MapPin, MessageCircle, Phone } from 'lucide-react';
import type { Metadata } from 'next';
import { Pagos } from '@/components/portada/Secciones';
import { datosTienda, whatsappDe } from '@/lib/tienda';

export const metadata: Metadata = {
  title: 'Contacto',
  description: 'Dirección, horarios, WhatsApp y formas de pago de La Casa de las Baterías.',
};

/** Mapa, dirección, horarios, formas de pago y WhatsApp (FR-051). */
export default async function Contacto() {
  const d = await datosTienda();
  const consulta = encodeURIComponent(d.domicilio);
  return (
    <>
      <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-12 md:grid-cols-[1fr_1.2fr] md:px-12 md:py-16">
        <div>
          <h1 className="titular text-[44px] md:text-[64px]">Contacto</h1>
          <dl className="mt-8 flex flex-col gap-6">
            <Dato icono={MapPin} titulo="Dirección">
              {d.domicilio}
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${consulta}`}
                className="mt-1 block font-semibold text-rojo-texto underline"
              >
                Cómo llegar
              </a>
            </Dato>
            <Dato icono={Clock} titulo="Horarios">
              {d.horarios.length
                ? d.horarios.map((h) => (
                    <span key={h} className="block">
                      {h}
                    </span>
                  ))
                : '[Horarios de atención]'}
            </Dato>
            {d.telefono && (
              <Dato icono={Phone} titulo="Teléfono">
                <a href={`tel:${d.telefono.replace(/\s/g, '')}`} className="num text-negro">
                  {d.telefono}
                </a>
              </Dato>
            )}
          </dl>
          <a href={whatsappDe(d)} className="boton boton-rojo mt-8 w-full md:w-fit">
            <MessageCircle aria-hidden size={22} />
            Escribinos por WhatsApp
          </a>
        </div>
        <iframe
          title={`Mapa: ${d.domicilio}`}
          src={`https://www.google.com/maps?q=${consulta}&output=embed`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="aspect-[4/3] w-full rounded-md border-2 border-gris-200"
        />
      </div>
      <Pagos descuentoPct={d.descuentoPct} />
    </>
  );
}

function Dato({
  icono: Icono,
  titulo,
  children,
}: {
  icono: typeof MapPin;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <Icono aria-hidden size={28} className="mt-0.5 flex-none text-rojo" />
      <div>
        <dt className="font-bold">{titulo}</dt>
        <dd className="mt-0.5">{children}</dd>
      </div>
    </div>
  );
}
