'use client';

import type { ConfiguracionAdmin } from '@casa/shared';
import { Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { enviar, ErrorApi } from '@/lib/api';
import { Aviso, CampoPanel, Tarjeta } from './Formulario';

/** Configuración de la tienda (FR-047): descuento, datos bancarios, contacto y horarios. */
export function FormConfiguracion({ inicial }: { inicial: ConfiguracionAdmin }) {
  const router = useRouter();
  const [c, setC] = useState(inicial);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [enviando, setEnviando] = useState(false);

  const banco = (k: keyof ConfiguracionAdmin['banco']) => (e: { target: { value: string } }) =>
    setC((x) => ({ ...x, banco: { ...x.banco, [k]: e.target.value } }));
  const comercio =
    (k: 'razonSocial' | 'cuit' | 'domicilio' | 'telefono') => (e: { target: { value: string } }) =>
      setC((x) => ({ ...x, comercio: { ...x.comercio, [k]: e.target.value } }));
  const horario = (i: number, k: 'dias' | 'desde' | 'hasta', valor: string) =>
    setC((x) => ({
      ...x,
      horarios: x.horarios.map((h, j) => (j === i ? { ...h, [k]: valor } : h)),
    }));

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setAviso(null);
    setErrores({});
    try {
      const nueva = await enviar<ConfiguracionAdmin>(
        '/admin/configuracion',
        {
          descuentoPct: Number(c.descuentoPct),
          banco: c.banco,
          whatsapp: c.whatsapp,
          horarios: c.horarios.filter((h) => h.dias.trim()),
          comercio: {
            razonSocial: c.comercio.razonSocial,
            cuit: c.comercio.cuit,
            domicilio: c.comercio.domicilio,
            telefono: c.comercio.telefono,
          },
          googleResenasUrl: c.googleResenasUrl,
        },
        undefined,
        'PATCH',
      );
      setC(nueva);
      setAviso({ tipo: 'ok', texto: 'Guardado. La tienda ya muestra los cambios.' });
      router.refresh();
    } catch (err) {
      if (err instanceof ErrorApi && Object.keys(err.campos).length) {
        setErrores(err.campos);
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
      <Tarjeta titulo="Precios">
        <div className="max-w-[320px]">
          <CampoPanel
            id="descuentoPct"
            rotulo="Descuento por transferencia o efectivo (%)"
            ayuda="Se aplica en todas las fichas y en el checkout."
            inputMode="decimal"
            value={String(c.descuentoPct)}
            onChange={(e) =>
              setC((x) => ({ ...x, descuentoPct: e.target.value as unknown as number }))
            }
            error={errores.descuentoPct}
          />
        </div>
      </Tarjeta>

      <Tarjeta titulo="Datos para transferencias">
        <p className="-mt-2 mb-4 text-[15px] text-gris-600">
          Se muestran al comprador que paga por transferencia. Si cambian el CBU o el alias, te
          avisamos por mail.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <CampoPanel
            id="banco.titular"
            rotulo="Titular"
            value={c.banco.titular}
            onChange={banco('titular')}
            error={errores['banco.titular']}
          />
          <CampoPanel
            id="banco.cuit"
            rotulo="CUIT"
            value={c.banco.cuit}
            onChange={banco('cuit')}
            error={errores['banco.cuit']}
          />
          <CampoPanel
            id="banco.cbu"
            rotulo="CBU"
            inputMode="numeric"
            value={c.banco.cbu}
            onChange={banco('cbu')}
            error={errores['banco.cbu']}
          />
          <CampoPanel
            id="banco.alias"
            rotulo="Alias"
            value={c.banco.alias}
            onChange={banco('alias')}
            error={errores['banco.alias']}
          />
        </div>
      </Tarjeta>

      <Tarjeta titulo="Comercio y contacto">
        <div className="grid gap-4 md:grid-cols-2">
          <CampoPanel
            id="whatsapp"
            rotulo="WhatsApp"
            ayuda="Solo números, con 549 adelante: 5492235123456."
            inputMode="numeric"
            value={c.whatsapp}
            onChange={(e) => setC((x) => ({ ...x, whatsapp: e.target.value }))}
            error={errores.whatsapp}
          />
          <CampoPanel
            id="comercio.telefono"
            rotulo="Teléfono del local"
            value={c.comercio.telefono}
            onChange={comercio('telefono')}
            error={errores['comercio.telefono']}
          />
          <CampoPanel
            id="comercio.razonSocial"
            rotulo="Razón social"
            ayuda="Aparece en el pie y en los mails."
            value={c.comercio.razonSocial}
            onChange={comercio('razonSocial')}
            error={errores['comercio.razonSocial']}
          />
          <CampoPanel
            id="comercio.cuit"
            rotulo="CUIT del comercio"
            value={c.comercio.cuit}
            onChange={comercio('cuit')}
            error={errores['comercio.cuit']}
          />
          <div className="md:col-span-2">
            <CampoPanel
              id="comercio.domicilio"
              rotulo="Domicilio"
              value={c.comercio.domicilio}
              onChange={comercio('domicilio')}
              error={errores['comercio.domicilio']}
            />
          </div>
          <div className="md:col-span-2">
            <CampoPanel
              id="googleResenasUrl"
              rotulo="Enlace a las reseñas de Google"
              ayuda="Se manda en el mail de pedido entregado."
              value={c.googleResenasUrl}
              onChange={(e) => setC((x) => ({ ...x, googleResenasUrl: e.target.value }))}
              error={errores.googleResenasUrl}
            />
          </div>
        </div>
      </Tarjeta>

      <Tarjeta
        titulo="Horarios de atención"
        accion={
          <button
            type="button"
            onClick={() =>
              setC((x) => ({
                ...x,
                horarios: [...x.horarios, { dias: '', desde: '08:30', hasta: '18:00' }],
              }))
            }
            className="boton boton-borde !min-h-11 !px-3 !text-[16px]"
          >
            <Plus aria-hidden size={18} /> Agregar
          </button>
        }
      >
        {c.horarios.length === 0 && (
          <p className="text-gris-600">
            Sin horarios cargados. En la tienda aparece «[Horarios de atención]».
          </p>
        )}
        <ul className="flex flex-col gap-3">
          {c.horarios.map((h, i) => (
            <li
              key={i}
              className="grid items-end gap-3 md:grid-cols-[minmax(0,1fr)_130px_130px_auto]"
            >
              <CampoPanel
                id={`h${i}-dias`}
                rotulo="Días"
                placeholder="Lunes a viernes"
                value={h.dias}
                onChange={(e) => horario(i, 'dias', e.target.value)}
                error={errores[`horarios.${i}.dias`]}
              />
              <CampoPanel
                id={`h${i}-desde`}
                rotulo="Desde"
                type="time"
                value={h.desde}
                onChange={(e) => horario(i, 'desde', e.target.value)}
                error={errores[`horarios.${i}.desde`]}
              />
              <CampoPanel
                id={`h${i}-hasta`}
                rotulo="Hasta"
                type="time"
                value={h.hasta}
                onChange={(e) => horario(i, 'hasta', e.target.value)}
                error={errores[`horarios.${i}.hasta`]}
              />
              <button
                type="button"
                onClick={() =>
                  setC((x) => ({ ...x, horarios: x.horarios.filter((_, j) => j !== i) }))
                }
                aria-label={`Quitar el horario ${i + 1}`}
                className="grid size-14 place-items-center rounded-sm border-2 border-gris-300 text-rojo-texto"
              >
                <Trash2 aria-hidden size={20} />
              </button>
            </li>
          ))}
        </ul>
      </Tarjeta>

      <div className="sticky bottom-0 -mx-4 flex flex-col gap-3 border-t-2 border-gris-200 bg-gris-100 px-4 py-4 md:mx-0 md:px-0">
        {aviso && <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>}
        <button
          type="submit"
          disabled={enviando}
          className="boton boton-rojo w-full md:w-fit disabled:opacity-70"
        >
          {enviando ? 'Guardando…' : 'Guardar configuración'}
        </button>
      </div>
    </form>
  );
}
