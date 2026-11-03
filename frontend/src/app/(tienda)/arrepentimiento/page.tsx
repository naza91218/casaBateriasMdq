import type { Metadata } from 'next';
import { FormArrepentimiento } from '@/components/legales/FormArrepentimiento';

export const metadata: Metadata = {
  title: 'Botón de arrepentimiento',
  description: 'Arrepentite de tu compra dentro de los 10 días, sin dar motivos.',
};

export default function Arrepentimiento() {
  return (
    <div className="mx-auto max-w-[640px] px-4 py-12 md:px-0 md:py-16">
      <h1 className="titular text-[44px] md:text-[60px]">Botón de arrepentimiento</h1>
      <p className="mt-3">
        Tenés 10 días corridos desde que recibiste la batería para arrepentirte, sin dar motivos
        (Ley 24.240). Completá los datos y te mandamos un código por mail. Después te escribimos
        para coordinar la devolución.
      </p>
      <FormArrepentimiento />
    </div>
  );
}
