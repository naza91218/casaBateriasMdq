import type { ItemProducto } from '@casa/shared';
import { Check, ImageIcon, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { enlaceWhatsapp } from '@/lib/api';
import { pesos } from '@/lib/formato';

/** Tarjeta de producto del resultado y del catálogo: foto, datos, precio y una sola acción. */
export function TarjetaProducto({ p, whatsapp }: { p: ItemProducto; whatsapp: string }) {
  const datos = [p.medida, `${p.amperajeAh} Ah`, p.cca ? `${p.cca} A de arranque` : null]
    .filter(Boolean)
    .join(' · ');
  return (
    <article className="flex flex-col overflow-hidden rounded-md border-2 border-gris-200 bg-blanco transition-colors duration-150 hover:border-negro">
      <Link
        href={`/producto/${p.slug}`}
        className="grid aspect-[4/3] place-items-center bg-gris-100 p-5"
        tabIndex={-1}
        aria-hidden
      >
        {p.foto ? (
          // Las fotos vienen del almacenamiento de la API (R2): tamaño ya optimizado en WebP.
          <img src={p.foto} alt="" loading="lazy" className="h-full w-auto object-contain" />
        ) : (
          <span className="flex flex-col items-center gap-2 text-[15px] font-semibold text-gris-600">
            <ImageIcon aria-hidden size={36} strokeWidth={1.5} />
            [Foto de {p.marca.nombre}]
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-[22px] leading-tight font-bold">
          <Link href={`/producto/${p.slug}`} className="rounded-sm no-underline hover:underline">
            {p.nombre}
          </Link>
        </h3>
        <p className="num mt-1 text-gris-600">{datos}</p>

        {p.disponible ? (
          <>
            <p className="mt-4">
              <span className="num block text-[30px] leading-none font-bold">
                {pesos(p.precios.transferenciaOEfectivo)}
              </span>
              <span className="mt-1 block text-[16px] font-semibold text-rojo-texto">
                con transferencia o efectivo ({p.precios.descuentoPct} % menos)
              </span>
              <span className="num mt-1 block text-[16px] text-gris-600">
                {pesos(p.precios.lista)} con Mercado Pago
              </span>
            </p>
            <p className="mt-4 flex items-center gap-2 text-[16px] font-semibold">
              <Check aria-hidden size={18} strokeWidth={3} className="flex-none text-rojo" />
              Colocación incluida · 12 meses de garantía
            </p>
            <Link href={`/producto/${p.slug}`} className="boton boton-rojo mt-5 w-full">
              Comprar
            </Link>
          </>
        ) : (
          <>
            <p className="mt-4 text-[17px] font-semibold">
              <span className="text-rojo-texto">Sin stock.</span> Escribinos y te avisamos cuando
              entra, o te recomendamos otra.
            </p>
            <a
              href={enlaceWhatsapp(whatsapp, `Hola, quería la ${p.nombre} y figura sin stock.`)}
              className="boton boton-borde mt-auto w-full"
            >
              <MessageCircle aria-hidden size={22} />
              Consultar por WhatsApp
            </a>
          </>
        )}
      </div>
    </article>
  );
}
