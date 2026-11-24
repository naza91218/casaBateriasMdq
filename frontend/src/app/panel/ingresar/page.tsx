import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Logo } from '@/components/marca/Logo';
import { demo } from '@/lib/demo';
import { FormIngreso } from './FormIngreso';

export const metadata: Metadata = { title: 'Ingresar al panel', robots: { index: false } };

export default async function Ingresar({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { urlMails, emailAdmin, ingresoDirecto } = demo();
  // Demo: directo al panel. Con un error a la vista (enlace vencido) se muestra el formulario.
  if (ingresoDirecto && !error) redirect('/api/v1/auth/demo');
  return (
    <main className="grid min-h-dvh place-items-center bg-gris-100 px-4 py-10">
      <div className="w-full max-w-[460px]">
        <Logo />
        <div className="mt-6 rounded-md border-2 border-negro bg-blanco p-6 md:p-8">
          <h1 className="text-[30px] leading-tight font-bold">Ingresar al panel</h1>
          <p className="mt-2 text-gris-600">
            Escribí tu mail y te mandamos un enlace para entrar. Sin contraseña: vence a los 15
            minutos y sirve una sola vez.
          </p>
          {error === 'enlace_vencido' && (
            <p
              role="alert"
              className="mt-4 rounded-sm border-2 border-rojo-texto p-3 font-semibold text-rojo-texto"
            >
              Ese enlace ya se usó o venció. Pedí uno nuevo.
            </p>
          )}
          <FormIngreso />
        </div>
        {urlMails && (
          <div className="mt-4 rounded-md border-2 border-dashed border-gris-400 bg-blanco p-5">
            <p className="font-bold">Demo</p>
            <p className="mt-1 text-gris-600">
              {emailAdmin && (
                <>
                  Entrá con <strong className="text-negro">{emailAdmin}</strong>.{' '}
                </>
              )}
              El enlace no va a un mail real: llega a la bandeja de la demo.
            </p>
            <a
              href={urlMails}
              target="_blank"
              rel="noopener"
              className="boton boton-rojo mt-3 inline-flex !min-h-12 !px-5"
            >
              Abrir la bandeja de mails
            </a>
          </div>
        )}
      </div>
    </main>
  );
}
