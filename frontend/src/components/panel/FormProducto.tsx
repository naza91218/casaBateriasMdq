'use client';

import type { ProductoAdmin } from '@casa/shared';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { enviar, ErrorApi } from '@/lib/api';
import { aCentavos, aPesos, Aviso, CampoPanel, ErrorPanel } from './Formulario';

const MARCAS = ['Sermat', 'Edna', 'Herbo', 'Volta'];

type Valores = {
  sku: string;
  nombre: string;
  marca: string;
  medida: string;
  amperajeAh: string;
  cca: string;
  gama: 'economica' | 'reforzada';
  descripcion: string;
  precio: string;
  stock: string;
  garantia: string;
  estado: 'activo' | 'pausado' | 'a_revisar';
};

/** Alta y edición de un producto. Los precios se escriben en pesos y viajan en centavos. */
export function FormProducto({ producto }: { producto?: ProductoAdmin }) {
  const router = useRouter();
  const [v, setV] = useState<Valores>({
    sku: producto?.sku ?? '',
    nombre: producto?.nombre ?? '',
    marca: producto?.marca.nombre ?? 'Sermat',
    medida: producto?.medida ?? '',
    amperajeAh: producto ? String(producto.amperajeAh) : '',
    cca: producto?.cca ? String(producto.cca) : '',
    gama: producto?.gama ?? 'economica',
    descripcion: producto?.descripcion ?? '',
    precio: producto?.precioLista ? aPesos(producto.precioLista) : '',
    stock: producto ? String(producto.stock) : '0',
    garantia: producto ? String(producto.garantiaMeses) : '',
    estado: producto?.estado ?? 'pausado',
  });
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const set = (k: keyof Valores) => (e: { target: { value: string } }) => {
    setV((x) => ({ ...x, [k]: e.target.value }));
    setErrores((x) => ({ ...x, [k]: '' }));
  };

  async function guardar(e: FormEvent) {
    e.preventDefault();
    const precio = aCentavos(v.precio);
    if (Number.isNaN(precio)) {
      setErrores({ precio: 'Escribí el precio en pesos, por ejemplo 120000' });
      return;
    }
    const datos = {
      nombre: v.nombre,
      marca: v.marca,
      medida: v.medida,
      amperajeAh: Number(v.amperajeAh) || 0,
      cca: v.cca ? Number(v.cca) : null,
      gama: v.gama,
      descripcion: v.descripcion,
      ...(precio !== null ? { precioLista: precio } : {}),
      stock: Number(v.stock) || 0,
      // Vacío al crear: el servidor pone 18 meses a las Sermat de 12x45 a 12x75 y 12 al resto.
      ...(v.garantia.trim() ? { garantiaMeses: Number(v.garantia) } : {}),
    };
    setEnviando(true);
    setAviso(null);
    try {
      if (producto) {
        await enviar(
          `/admin/productos/${producto.id}`,
          {
            ...datos,
            ...(v.estado !== 'a_revisar' && v.estado !== producto.estado
              ? { estado: v.estado }
              : {}),
          },
          undefined,
          'PATCH',
        );
        setAviso({ tipo: 'ok', texto: 'Guardado. La tienda ya muestra los cambios.' });
        router.refresh();
      } else {
        const nuevo = await enviar<ProductoAdmin>('/admin/productos', { sku: v.sku, ...datos });
        router.push(`/panel/productos/${nuevo.id}`);
      }
    } catch (err) {
      if (err instanceof ErrorApi && Object.keys(err.campos).length) {
        setErrores(
          Object.fromEntries(
            Object.entries(err.campos).map(([k, m]) => [k === 'precioLista' ? 'precio' : k, m]),
          ),
        );
        setAviso({ tipo: 'error', texto: 'Revisá los datos marcados.' });
      } else {
        setAviso({
          tipo: 'error',
          texto:
            err instanceof ErrorApi && err.estado < 500
              ? err.message
              : 'No se pudo guardar. Probá de nuevo.',
        });
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={guardar} noValidate className="flex flex-col gap-5">
      <div className="grid gap-4 md:grid-cols-2">
        {!producto && (
          <CampoPanel
            id="sku"
            rotulo="Código (SKU)"
            ayuda="El de la planilla del proveedor."
            value={v.sku}
            onChange={set('sku')}
            error={errores.sku}
          />
        )}
        <CampoPanel
          id="nombre"
          rotulo="Nombre"
          value={v.nombre}
          onChange={set('nombre')}
          error={errores.nombre}
        />
        <div>
          <label htmlFor="marca" className="block text-[17px] font-bold">
            Marca
          </label>
          <select id="marca" value={v.marca} onChange={set('marca')} className="selector mt-1.5">
            {MARCAS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
          <ErrorPanel id="marca" error={errores.marca} />
        </div>
        <CampoPanel
          id="medida"
          rotulo="Medida"
          ayuda="Por ejemplo 12x65."
          value={v.medida}
          onChange={set('medida')}
          error={errores.medida}
        />
        <CampoPanel
          id="amperajeAh"
          rotulo="Amperaje (Ah)"
          inputMode="numeric"
          value={v.amperajeAh}
          onChange={set('amperajeAh')}
          error={errores.amperajeAh}
        />
        <CampoPanel
          id="cca"
          rotulo="Corriente de arranque (A)"
          ayuda="Opcional."
          inputMode="numeric"
          value={v.cca}
          onChange={set('cca')}
          error={errores.cca}
        />
        <fieldset>
          <legend className="text-[17px] font-bold">Gama</legend>
          <div className="mt-1.5 flex gap-2">
            {(['economica', 'reforzada'] as const).map((g) => (
              <label
                key={g}
                className={`flex min-h-14 flex-1 cursor-pointer items-center justify-center rounded-sm border-2 font-semibold has-focus-visible:outline-3 has-focus-visible:outline-negro ${v.gama === g ? 'border-negro bg-negro text-blanco' : 'border-gris-300 bg-blanco'}`}
              >
                <input
                  type="radio"
                  name="gama"
                  value={g}
                  checked={v.gama === g}
                  onChange={set('gama')}
                  className="sr-only"
                />
                {g === 'economica' ? 'Económica' : 'Reforzada'}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <CampoPanel
          id="precio"
          rotulo="Precio de lista ($)"
          ayuda="El de Mercado Pago. El descuento se calcula solo."
          inputMode="decimal"
          value={v.precio}
          onChange={set('precio')}
          error={errores.precio}
        />
        <CampoPanel
          id="stock"
          rotulo="Stock"
          inputMode="numeric"
          value={v.stock}
          onChange={set('stock')}
          error={errores.stock}
        />
        <CampoPanel
          id="garantia"
          rotulo="Garantía (meses)"
          ayuda={
            producto
              ? 'Se muestra en la tarjeta y en la ficha.'
              : 'Si lo dejás vacío: 18 las Sermat de 12x45 a 12x75 y 12 el resto.'
          }
          inputMode="numeric"
          value={v.garantia}
          onChange={set('garantia')}
          error={errores.garantiaMeses}
        />
        {producto && (
          <div>
            <label htmlFor="estado" className="block text-[17px] font-bold">
              Estado
            </label>
            <p className="text-[15px] text-gris-600">Publicado se ve en la tienda.</p>
            <select
              id="estado"
              value={v.estado}
              onChange={set('estado')}
              className="selector mt-1.5"
            >
              {v.estado === 'a_revisar' && <option value="a_revisar">A revisar</option>}
              <option value="activo">Publicado</option>
              <option value="pausado">Pausado</option>
            </select>
            <ErrorPanel id="estado" error={errores.estado} />
          </div>
        )}
      </div>

      <div>
        <label htmlFor="descripcion" className="block text-[17px] font-bold">
          Descripción
        </label>
        <p className="text-[15px] text-gris-600">
          Opcional. Aparece en la ficha, debajo del nombre.
        </p>
        <textarea
          id="descripcion"
          rows={3}
          value={v.descripcion}
          onChange={set('descripcion')}
          className="mt-1.5 w-full rounded-sm border-2 border-gris-300 bg-blanco p-3.5 text-[18px] focus-visible:border-negro focus-visible:outline-none"
        />
      </div>

      {aviso && <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>}
      <button
        type="submit"
        disabled={enviando}
        className="boton boton-rojo w-full md:w-fit disabled:opacity-70"
      >
        {enviando ? 'Guardando…' : producto ? 'Guardar cambios' : 'Crear producto'}
      </button>
    </form>
  );
}
