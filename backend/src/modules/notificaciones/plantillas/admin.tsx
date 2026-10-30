import type { Plantilla } from './index.js';
import { Caja, LayoutAdmin, Linea, Parrafo, pesos, texto } from './layout.js';

const MEDIOS: Record<string, string> = {
  mercadopago: 'Mercado Pago',
  transferencia: 'Transferencia',
  efectivo: 'Efectivo en el local',
};

/** Avisos al administrador (FR-037) y el enlace de ingreso al panel (FR-041). */
export const plantillasAdmin: Record<string, Plantilla> = {
  aviso_admin_pedido_nuevo: (d) => ({
    asunto: `Nuevo pedido #${texto(d.numero)} · ${pesos(d.total)}`,
    cuerpo: (
      <LayoutAdmin
        titulo={`Nuevo pedido #${texto(d.numero)}`}
        enlace={{ href: texto(d.urlPanel), texto: 'Ver en el panel' }}
      >
        <Parrafo>
          Entró un pedido por <strong>{pesos(d.total)}</strong>, con pago por{' '}
          {MEDIOS[texto(d.medioPago)] ?? texto(d.medioPago)} y{' '}
          {d.entrega === 'colocacion' ? 'colocación a domicilio' : 'retiro en el local'}.
        </Parrafo>
        {d.medioPago === 'transferencia' ? (
          <Parrafo>Cuando veas la transferencia en la cuenta, confirmala desde el panel.</Parrafo>
        ) : null}
      </LayoutAdmin>
    ),
  }),
  aviso_admin_pago: (d) => ({
    asunto: `Pago confirmado · pedido #${texto(d.numero)}`,
    cuerpo: (
      <LayoutAdmin
        titulo={`Pago confirmado · #${texto(d.numero)}`}
        enlace={{ href: texto(d.urlPanel), texto: 'Ver en el panel' }}
      >
        <Parrafo>
          Se confirmó el pago del pedido #{texto(d.numero)} por {pesos(d.total)}. Ya podés
          prepararlo.
        </Parrafo>
      </LayoutAdmin>
    ),
  }),
  aviso_admin_alerta: (d) => ({
    asunto: `Revisá el pedido #${texto(d.numero)}: ${d.tipo === 'monto_distinto' ? 'monto distinto' : 'pago sobre pedido cancelado'}`,
    cuerpo: (
      <LayoutAdmin
        titulo={`Revisá el pedido #${texto(d.numero)}`}
        enlace={{ href: texto(d.urlPanel), texto: 'Ver alertas en el panel' }}
      >
        <Parrafo>
          {d.tipo === 'monto_distinto'
            ? 'Mercado Pago informó un pago con un monto distinto al del pedido. No se aplicó: revisalo en el panel.'
            : 'Mercado Pago informó un pago sobre un pedido que ya estaba cancelado. Revisalo en el panel para devolverlo o retomar el pedido.'}
        </Parrafo>
      </LayoutAdmin>
    ),
  }),
  aviso_admin_canje: (d) => ({
    asunto: `Consulta de canje de ${texto(d.nombre)}`,
    cuerpo: (
      <LayoutAdmin
        titulo="Nueva consulta de canje"
        enlace={{ href: texto(d.urlPanel), texto: 'Ver consultas en el panel' }}
      >
        <Parrafo>
          Alguien quiere cotizar el canje de su batería usada. La conversación sigue por WhatsApp.
        </Parrafo>
        <Caja>
          <Linea>Nombre: {texto(d.nombre)}</Linea>
          <Linea>Teléfono: {texto(d.telefono)}</Linea>
          {d.auto ? <Linea>Auto: {texto(d.auto)}</Linea> : null}
          {d.bateriaUsada ? <Linea>Batería usada: {texto(d.bateriaUsada)}</Linea> : null}
          <Linea>Localidad: {texto(d.localidad)}</Linea>
        </Caja>
      </LayoutAdmin>
    ),
  }),
  aviso_admin_arrepentimiento: (d) => ({
    asunto: `Arrepentimiento · pedido #${texto(d.numero)}`,
    cuerpo: (
      <LayoutAdmin
        titulo={`Arrepentimiento · pedido #${texto(d.numero)}`}
        enlace={{ href: texto(d.urlPanel), texto: 'Ver el pedido en el panel' }}
      >
        <Parrafo>
          {texto(d.nombre)} pidió arrepentirse de la compra. Código de la solicitud:{' '}
          <strong>{texto(d.codigo)}</strong>.
        </Parrafo>
        {d.pedidoEncontrado === false ? (
          <Parrafo>
            Ese número no corresponde a ningún pedido de la tienda: puede ser un error de tipeo o
            una compra en el local.
          </Parrafo>
        ) : null}
        <Parrafo>
          Por ley hay que responder la solicitud: contactalo y registrá lo que se resuelva en el
          pedido.
        </Parrafo>
      </LayoutAdmin>
    ),
  }),
  enlace_ingreso: (d) => ({
    asunto: 'Tu enlace para entrar al panel',
    cuerpo: (
      <LayoutAdmin
        titulo="Entrá al panel"
        enlace={{ href: texto(d.url), texto: 'Entrar al panel' }}
      >
        <Parrafo>Usá este enlace para entrar. Vence en 15 minutos y sirve una sola vez.</Parrafo>
        <Parrafo>Si no lo pediste, ignorá este mail.</Parrafo>
      </LayoutAdmin>
    ),
  }),
};
