import type { ResultadoCompatibles } from '@casa/shared';
import { MessageCircle, RotateCcw } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { TarjetaProducto } from '@/components/catalogo/TarjetaProducto';
import { ErrorApi, intentar, pedir } from '@/lib/api';
import { enLista } from '@/lib/formato';
import { datosTienda } from '@/lib/tienda';

type Params = { marca?: string; modelo?: string; anio?: string };

const GAMAS = {
  economica: { titulo: 'Económicas', bajada: 'Para el uso de todos los días.' },
  reforzada: { titulo: 'Reforzadas', bajada: 'Para exigirle más: frío, viajes y muchos consumos.' },
} as const;

export const metadata: Metadata = {
  title: 'Baterías para tu auto',
  // Cada combinación de auto es un resultado, no una página para Google (para eso está /auto/...).
  robots: { index: false, follow: true },
};

async function buscar(p: Params): Promise<ResultadoCompatibles | 'no-encontrado' | null> {
  const q = new URLSearchParams({
    marca: p.marca!,
    modelo: p.modelo!,
    ...(p.anio ? { anio: p.anio } : {}),
  });
  try {
    return await pedir<ResultadoCompatibles>(`/vehiculos/compatibles?${q}`, {
      etiquetas: ['buscador', 'catalogo'],
    });
  } catch (e) {
    // Una marca o modelo inventados en la dirección: 400/404 de la API.
    if (e instanceof ErrorApi && e.estado < 500) return 'no-encontrado';
    return null;
  }
}

export default async function Resultado({ searchParams }: { searchParams: Promise<Params> }) {
  const p = await searchParams;
  if (!p.marca || !p.modelo) redirect('/#buscador');

  const [r, datos] = await Promise.all([buscar(p), intentar(datosTienda())]);
  const whatsapp = datos?.whatsapp ?? '';

  if (r === null || r === 'no-encontrado') {
    return (
      <Aviso
        titulo={r === null ? 'No pudimos buscar ahora' : 'No encontramos ese auto'}
        texto={
          r === null
            ? 'Hay un problema de nuestro lado. Probá de nuevo en un rato, o escribinos y te decimos qué batería lleva tu auto.'
            : 'Volvé a elegir marca, modelo y año en el buscador, o escribinos y te ayudamos.'
        }
        whatsappUrl={`https://wa.me/${whatsapp.replace(/\D/g, '')}`}
      />
    );
  }

  const auto = [r.vehiculo.marca, r.vehiculo.modelo, r.vehiculo.anio].filter(Boolean).join(' ');

  return (
    <>
      <section aria-labelledby="resultado-titulo" className="bg-gris-100">
        <div className="mx-auto max-w-[1200px] px-4 py-10 md:px-12 md:py-14">
          <h1 id="resultado-titulo" className="titular text-[44px] md:text-[64px]">
            {auto}
          </h1>
          {r.medidas.length > 0 && (
            <p className="mt-3 text-[20px] md:text-[22px]">
              Tu auto lleva una batería{' '}
              <strong className="num font-bold">{enLista(r.medidas)}</strong>.
              {r.grupos.length > 0 && ' Estas le sirven:'}
            </p>
          )}
          <Link
            href="/#buscador"
            className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-sm font-semibold text-rojo-texto underline hover:text-negro"
          >
            <RotateCcw aria-hidden size={20} />
            Cambiar de auto
          </Link>
        </div>
      </section>

      {r.sinResultados ? (
        <Aviso
          titulo={
            r.sinResultados === 'auto_no_cargado'
              ? 'Todavía no cargamos este auto'
              : 'Ahora no tenemos stock para este auto'
          }
          texto={
            r.sinResultados === 'auto_no_cargado'
              ? 'Escribinos con el modelo y el año y te decimos qué batería lleva y cuánto sale.'
              : 'Escribinos y te avisamos cuando entra, o te ofrecemos otra que le sirva.'
          }
          whatsappUrl={r.whatsapp.url}
          sinEncabezado
        />
      ) : (
        <div className="mx-auto max-w-[1200px] px-4 py-12 md:px-12 md:py-16">
          {r.grupos.map((g) => (
            <section key={g.gama} aria-labelledby={`gama-${g.gama}`} className="mb-14 last:mb-0">
              <h2 id={`gama-${g.gama}`} className="titular text-[34px] md:text-[44px]">
                {GAMAS[g.gama].titulo}
              </h2>
              <p className="mt-1 text-gris-600">{GAMAS[g.gama].bajada}</p>
              <ul className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {g.productos.map((prod) => (
                  <li key={prod.id} className="flex">
                    <TarjetaProducto p={prod} whatsapp={whatsapp} />
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <aside className="oscuro mt-14 flex flex-col gap-5 rounded-md bg-negro p-6 text-blanco md:flex-row md:items-center md:justify-between md:p-9">
            <div>
              <h2 className="titular text-[30px] md:text-[36px]">¿No estás seguro?</h2>
              <p className="mt-2 max-w-[56ch] text-gris-300">
                Si tu auto tiene GNC, equipo de audio o no sabés qué gama elegir, te asesoramos.
              </p>
            </div>
            <a href={r.whatsapp.url} className="boton boton-fantasma flex-none">
              <MessageCircle aria-hidden size={22} />
              Escribinos por WhatsApp
            </a>
          </aside>
        </div>
      )}
    </>
  );
}

function Aviso({
  titulo,
  texto,
  whatsappUrl,
  sinEncabezado = false,
}: {
  titulo: string;
  texto: string;
  whatsappUrl: string;
  sinEncabezado?: boolean;
}) {
  const Titulo = sinEncabezado ? 'h2' : 'h1';
  return (
    <section className="mx-auto max-w-[1200px] px-4 py-14 md:px-12 md:py-20">
      <div className="max-w-[640px] rounded-md border-2 border-negro p-6 md:p-9">
        <Titulo className="titular text-[34px] md:text-[44px]">{titulo}</Titulo>
        <p className="mt-3">{texto}</p>
        <div className="mt-6 flex flex-col gap-3 md:flex-row">
          <a href={whatsappUrl} className="boton boton-rojo">
            <MessageCircle aria-hidden size={22} />
            Escribinos por WhatsApp
          </a>
          <Link href="/#buscador" className="boton boton-borde">
            Volver al buscador
          </Link>
        </div>
      </div>
    </section>
  );
}
