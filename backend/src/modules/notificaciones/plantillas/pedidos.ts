import type { Contenido } from './index.js';

/**
 * Plantillas mínimas del ciclo del pedido (T086). El diseño común con React Email llega en T117.
 * Reciben solo datos sin DNI (FR-038).
 */
type Datos = Record<string, unknown>;

const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const pesos = (centavos: unknown) =>
  `$${(Number(centavos) / 100).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

interface Item {
  nombre: string;
  cantidad: number;
  precioUnitario: number;
}

function resumen(d: Datos): { html: string; texto: string } {
  const items = (d.items as Item[] | undefined) ?? [];
  const lineas = items.map((i) => `${i.cantidad} × ${i.nombre} — ${pesos(i.precioUnitario * i.cantidad)}`);
  const entrega = d.entrega === 'colocacion' ? 'Colocación a domicilio' : 'Retiro en el local';
  const texto = [
    `Pedido #${d.numero}`,
    ...lineas,
    `Entrega: ${entrega}`,
    `Total: ${pesos(d.total)}`,
    `Seguí tu pedido: ${d.urlSeguimiento}`,
    `¿Dudas? Escribinos por WhatsApp: ${d.whatsappUrl}`,
  ].join('\n');
  const html = `
    <p><strong>Pedido #${esc(d.numero)}</strong></p>
    <ul>${lineas.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
    <p>Entrega: ${esc(entrega)}<br>Total: <strong>${esc(pesos(d.total))}</strong></p>
    <p><a href="${esc(d.urlSeguimiento)}">Seguí tu pedido</a> · <a href="${esc(d.whatsappUrl)}">Escribinos por WhatsApp</a></p>`;
  return { html, texto };
}

function banco(d: Datos): { html: string; texto: string } {
  const b = d.banco as Record<string, string> | null;
  if (!b) return { html: '', texto: '' };
  const vence = d.venceEn ? new Date(String(d.venceEn)).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }) : '';
  const texto = `\nPara pagar, transferí ${pesos(d.total)} a:\nTitular: ${b.titular}\nCBU: ${b.cbu}\nAlias: ${b.alias}\nCUIT: ${b.cuit}\nTenés tiempo hasta el ${vence} (48 horas). Si no se acredita, el pedido se cancela.\n`;
  const html = `<p>Para pagar, transferí <strong>${esc(pesos(d.total))}</strong> a:<br>Titular: ${esc(b.titular)}<br>CBU: ${esc(b.cbu)}<br>Alias: ${esc(b.alias)}<br>CUIT: ${esc(b.cuit)}</p><p>Tenés tiempo hasta el ${esc(vence)} (48 horas). Si no se acredita, el pedido se cancela.</p>`;
  return { html, texto };
}

function armar(asunto: string, intro: string, d: Datos, extra?: { html: string; texto: string }): Contenido {
  const r = resumen(d);
  const saludo = d.nombre ? `Hola, ${String(d.nombre)}:` : 'Hola:';
  return {
    asunto,
    texto: [saludo, intro, extra?.texto ?? '', r.texto].filter(Boolean).join('\n\n'),
    html: `<p>${esc(saludo)}</p><p>${esc(intro)}</p>${extra?.html ?? ''}${r.html}`,
  };
}

export const plantillasPedidos: Record<string, (d: Datos) => Contenido> = {
  pedido_recibido: (d) =>
    armar(`Recibimos tu pedido #${d.numero}`, 'Gracias por tu compra. Ya tenemos tu pedido.', d, banco(d)),
  pago_confirmado: (d) =>
    armar(`Pago confirmado · pedido #${d.numero}`, 'Confirmamos tu pago. Te avisamos cuando salgamos a colocarla o esté lista para retirar.', d),
  en_camino: (d) => armar(`Vamos en camino · pedido #${d.numero}`, 'Vamos en camino a colocar tu batería.', d),
  listo_para_retirar: (d) =>
    armar(`Tu batería está lista · pedido #${d.numero}`, 'Tu batería está lista para retirar en el local.', d),
  entregado: (d) => {
    const resena = d.resenasUrl
      ? { texto: `¿Nos dejás tu opinión? ${d.resenasUrl}`, html: `<p><a href="${esc(d.resenasUrl)}">¿Nos dejás tu opinión en Google?</a></p>` }
      : undefined;
    return armar(`¡Listo! Pedido #${d.numero} entregado`, 'Tu pedido fue entregado. Gracias por elegirnos.', d, resena);
  },
  cancelado: (d) =>
    armar(`Pedido #${d.numero} cancelado`, 'Tu pedido se canceló. Si querés retomarlo, escribinos por WhatsApp.', d),
  aviso_admin_pedido_nuevo: (d) => ({
    asunto: `Nuevo pedido #${d.numero} · ${pesos(d.total)}`,
    texto: `Entró el pedido #${d.numero} (${String(d.medioPago)}).\nVer en el panel: ${d.urlPanel}`,
    html: `<p>Entró el pedido <strong>#${esc(d.numero)}</strong> (${esc(d.medioPago)}).</p><p><a href="${esc(d.urlPanel)}">Ver en el panel</a></p>`,
  }),
  aviso_admin_pago: (d) => ({
    asunto: `Pago confirmado · pedido #${d.numero}`,
    texto: `Se confirmó el pago del pedido #${d.numero}.\nVer en el panel: ${d.urlPanel}`,
    html: `<p>Se confirmó el pago del pedido <strong>#${esc(d.numero)}</strong>.</p><p><a href="${esc(d.urlPanel)}">Ver en el panel</a></p>`,
  }),
  aviso_admin_alerta: (d) => ({
    asunto: `Revisá el pedido #${d.numero}: ${d.tipo === 'monto_distinto' ? 'monto distinto' : 'pago sobre pedido cancelado'}`,
    texto: `Mercado Pago informó un pago que no se pudo aplicar al pedido #${d.numero}. Revisalo en el panel.`,
    html: `<p>Mercado Pago informó un pago que no se pudo aplicar al pedido <strong>#${esc(d.numero)}</strong>. Revisalo en el panel.</p>`,
  }),
};
