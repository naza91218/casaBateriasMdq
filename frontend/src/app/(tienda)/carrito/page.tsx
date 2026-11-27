import type { Metadata } from 'next';
import { Checkout } from '@/components/checkout/Checkout';
import { api, intentar } from '@/lib/api';
import { datosTienda } from '@/lib/tienda';

export const metadata: Metadata = { title: 'Terminá tu compra', robots: { index: false } };

/** Carrito y checkout en una sola página (FR-014): sin cuenta, tres bloques y el resumen. */
export default async function PaginaCarrito() {
  const [datos, config] = await Promise.all([datosTienda(), intentar(api.configuracion())]);
  return (
    <div className="bg-gris-100">
      <Checkout
        datos={{
          zonas: config?.zonas ?? [],
          domicilio: datos.domicilio,
          horarios: datos.horarios,
          descuentoPct: datos.descuentoPct,
          whatsapp: datos.whatsapp,
        }}
      />
    </div>
  );
}
