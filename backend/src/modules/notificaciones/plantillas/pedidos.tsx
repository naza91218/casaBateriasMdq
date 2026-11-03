import type { Plantilla } from './index.js';
import {
  Caja,
  Enlace,
  LayoutComprador,
  Linea,
  Parrafo,
  pesos,
  texto,
  type Datos,
} from './layout.js';

/** "1/11/26, 12:00 p. m.", en la hora de Argentina. */
const fecha = (iso: unknown) =>
  iso
    ? new Date(String(iso)).toLocaleString('es-AR', {
        timeZone: 'America/Argentina/Buenos_Aires',
        dateStyle: 'short',
        timeStyle: 'short',
      })
    : '';

/** Ciclo del pedido para el comprador (FR-036). Reciben solo datos sin DNI (FR-038). */
function DatosBancarios({ d }: { d: Datos }) {
  const b = d.banco as Record<string, string> | null | undefined;
  if (!b) return null;
  const vence = fecha(d.venceEn);
  return (
    <>
      <Parrafo>
        Para pagar, transferí <strong>{pesos(d.total)}</strong> a:
      </Parrafo>
      <Caja>
        <Linea>Titular: {b.titular}</Linea>
        <Linea>CBU: {b.cbu}</Linea>
        <Linea>Alias: {b.alias}</Linea>
        <Linea>CUIT: {b.cuit}</Linea>
      </Caja>
      <Parrafo>
        Tenés tiempo hasta el {vence} (48 horas). Si no se acredita, el pedido se cancela.
      </Parrafo>
    </>
  );
}

const pedido = (d: Datos) => `#${texto(d.numero)}`;

export const plantillasPedidos: Record<string, Plantilla> = {
  pedido_recibido: (d) => ({
    asunto: `Recibimos tu pedido ${pedido(d)}`,
    cuerpo: (
      <LayoutComprador
        d={d}
        titulo="¡Recibimos tu pedido!"
        intro={
          d.medioPago === 'efectivo'
            ? 'Gracias por tu compra. La pagás en el local cuando pasás a retirarla.'
            : 'Gracias por tu compra. Ya tenemos tu pedido.'
        }
      >
        <DatosBancarios d={d} />
        {d.medioPago === 'efectivo' && d.venceEn ? (
          <Parrafo>
            Te la guardamos hasta el {fecha(d.venceEn)}. Si no pasás a retirarla, el pedido se
            cancela.
          </Parrafo>
        ) : null}
      </LayoutComprador>
    ),
  }),
  pago_confirmado: (d) => ({
    asunto: `Pago confirmado · pedido ${pedido(d)}`,
    cuerpo: (
      <LayoutComprador
        d={d}
        titulo="Pago confirmado"
        intro="Confirmamos tu pago. Te avisamos cuando salgamos a colocarla o esté lista para retirar."
      />
    ),
  }),
  en_camino: (d) => ({
    asunto: `Vamos en camino · pedido ${pedido(d)}`,
    cuerpo: (
      <LayoutComprador d={d} titulo="Vamos en camino" intro="Salimos a colocar tu batería." />
    ),
  }),
  listo_para_retirar: (d) => ({
    asunto: `Tu batería está lista · pedido ${pedido(d)}`,
    cuerpo: (
      <LayoutComprador
        d={d}
        titulo="Tu batería está lista"
        intro="Ya podés pasar a retirarla por el local."
      />
    ),
  }),
  entregado: (d) => ({
    asunto: `¡Listo! Pedido ${pedido(d)} entregado`,
    cuerpo: (
      <LayoutComprador
        d={d}
        titulo="¡Pedido entregado!"
        intro="Tu pedido fue entregado. Gracias por elegirnos."
      >
        {d.resenasUrl ? (
          <Parrafo>
            ¿Cómo te atendimos?{' '}
            <Enlace href={texto(d.resenasUrl)}>Dejanos tu opinión en Google</Enlace>, nos ayuda un
            montón.
          </Parrafo>
        ) : null}
      </LayoutComprador>
    ),
  }),
  cancelado: (d) => ({
    asunto: `Pedido ${pedido(d)} cancelado`,
    cuerpo: (
      <LayoutComprador
        d={d}
        titulo="Pedido cancelado"
        intro="Tu pedido se canceló. Si querés retomarlo, escribinos por WhatsApp."
      />
    ),
  }),
};
