import type { ResumenAdmin } from '@casa/shared';
import type { Metadata } from 'next';
import { NavPanel } from '@/components/panel/NavPanel';
import { demo } from '@/lib/demo';
import { pedirPanel } from '@/lib/panel';

export const metadata: Metadata = {
  title: { default: 'Panel', template: '%s · Panel' },
  robots: { index: false, follow: false },
};

/** Todo lo de adentro del panel exige sesión: sin ella, `pedirPanel` manda al ingreso. */
export default async function LayoutPanel({ children }: { children: React.ReactNode }) {
  const [{ usuario }, resumen] = await Promise.all([
    pedirPanel<{ usuario: { email: string } }>('/auth/sesion'),
    pedirPanel<ResumenAdmin>('/admin/resumen'),
  ]);
  return (
    <div className="min-h-dvh bg-gris-100 lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
      <NavPanel email={usuario.email} resumen={resumen} urlMails={demo().urlMails} />
      <main id="contenido" className="min-w-0 px-4 py-6 md:px-8 md:py-8">
        {children}
      </main>
    </div>
  );
}
