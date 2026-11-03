import type { Metadata } from 'next';
import { Logo } from '@/components/marca/Logo';
import { FormIngreso } from './FormIngreso';

export const metadata: Metadata = { title: 'Ingresar al panel', robots: { index: false } };

export default async function Ingresar({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
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
      </div>
    </main>
  );
}
