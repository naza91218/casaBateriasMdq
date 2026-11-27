import { createHmac, timingSafeEqual } from 'node:crypto';
import type {
  EstadoPagoExterno,
  FirmaWebhook,
  PagoExterno,
  PasarelaPago,
  PreferenciaPago,
} from '../shared-kernel/puertos.js';

const API = 'https://api.mercadopago.com';

const aPesos = (centavos: bigint) => Number(centavos) / 100;

/** Verifica x-signature: HMAC-SHA256 de "id:<id>;request-id:<rid>;ts:<ts>;" (contracts/webhook). */
export function verificarFirmaMp(secreto: string, f: FirmaWebhook): boolean {
  const partes = Object.fromEntries(
    f.cabeceraFirma.split(',').map((p) => p.trim().split('=') as [string, string]),
  );
  const ts = partes.ts;
  const v1 = partes.v1;
  if (!ts || !v1 || !secreto) return false;
  const id = /^[a-z0-9]+$/i.test(f.idRecurso) ? f.idRecurso.toLowerCase() : f.idRecurso;
  const manifiesto = `id:${id};request-id:${f.requestId};ts:${ts};`;
  const esperado = Buffer.from(createHmac('sha256', secreto).update(manifiesto).digest('hex'));
  const recibido = Buffer.from(v1);
  return esperado.length === recibido.length && timingSafeEqual(esperado, recibido);
}

/**
 * Checkout Pro por REST (research R5). Solo medios instantáneos: sin Rapipago/Pago Fácil
 * (FR-034b) y con vencimiento igual al de la reserva.
 */
export class PasarelaMercadoPago implements PasarelaPago {
  constructor(
    private readonly accessToken: string,
    private readonly secretoWebhook: string,
  ) {}

  private async llamar(ruta: string, init?: RequestInit): Promise<Record<string, unknown>> {
    const r = await fetch(`${API}${ruta}`, {
      ...init,
      headers: { authorization: `Bearer ${this.accessToken}`, 'content-type': 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!r.ok) throw new Error(`Mercado Pago respondió ${r.status} en ${ruta.split('?')[0]}`);
    return (await r.json()) as Record<string, unknown>;
  }

  async crearPreferencia(p: PreferenciaPago): Promise<{ id: string; initPoint: string }> {
    const cuerpo = {
      external_reference: p.pedidoId,
      items: p.items.map((i) => ({
        title: i.titulo,
        quantity: i.cantidad,
        unit_price: aPesos(i.precioUnitarioCentavos),
        currency_id: 'ARS',
      })),
      payer: { email: p.emailComprador },
      notification_url: p.urlNotificacion,
      back_urls: { success: p.urlRetorno, failure: p.urlRetorno, pending: p.urlRetorno },
      auto_return: 'approved',
      expires: true,
      expiration_date_to: p.venceEn.toISOString(),
      payment_methods: { excluded_payment_types: [{ id: 'ticket' }, { id: 'atm' }] },
      statement_descriptor: 'CASA BATERIAS',
    };
    const r = await this.llamar('/checkout/preferences', {
      method: 'POST',
      body: JSON.stringify(cuerpo),
    });
    return { id: String(r.id), initPoint: String(r.init_point) };
  }

  async consultarPago(id: string): Promise<PagoExterno> {
    const r = await this.llamar(`/v1/payments/${encodeURIComponent(id)}`);
    const monto = Math.round(Number(r.transaction_amount ?? 0) * 100);
    return {
      id: String(r.id),
      estado: String(r.status) as EstadoPagoExterno,
      montoCentavos: BigInt(monto),
      referenciaExterna: r.external_reference ? String(r.external_reference) : null,
      // Sin datos del pagador (FR-059).
      resumen: {
        status: r.status,
        status_detail: r.status_detail,
        payment_type_id: r.payment_type_id,
        transaction_amount: r.transaction_amount,
        date_approved: r.date_approved,
      },
    };
  }

  verificarFirma(f: FirmaWebhook): boolean {
    return verificarFirmaMp(this.secretoWebhook, f);
  }
}

/** Para tests y desarrollo sin credenciales: pagos simulados en memoria. */
export class PasarelaFalsa implements PasarelaPago {
  readonly preferencias: PreferenciaPago[] = [];
  readonly pagos = new Map<string, PagoExterno>();
  falla = false;

  constructor(readonly secreto = 'secreto-webhook-de-prueba') {}

  async crearPreferencia(p: PreferenciaPago) {
    if (this.falla) throw new Error('Mercado Pago no responde');
    this.preferencias.push(p);
    const id = `pref-${this.preferencias.length}`;
    return { id, initPoint: `https://mercadopago.test/checkout/${id}` };
  }

  async consultarPago(id: string): Promise<PagoExterno> {
    if (this.falla) throw new Error('Mercado Pago no responde');
    const pago = this.pagos.get(id);
    if (!pago) throw new Error('Pago inexistente');
    return pago;
  }

  verificarFirma(f: FirmaWebhook): boolean {
    return verificarFirmaMp(this.secreto, f);
  }

  /** Simula un pago en Mercado Pago. */
  registrarPago(
    id: string,
    pedidoId: string,
    estado: EstadoPagoExterno,
    montoCentavos: bigint,
  ): void {
    this.pagos.set(id, {
      id,
      estado,
      montoCentavos,
      referenciaExterna: pedidoId,
      resumen: { status: estado },
    });
  }

  /** Arma la cabecera x-signature válida para un pago. */
  firmar(id: string, requestId: string, ts = '1730000000'): string {
    const v1 = createHmac('sha256', this.secreto)
      .update(`id:${id};request-id:${requestId};ts:${ts};`)
      .digest('hex');
    return `ts=${ts},v1=${v1}`;
  }
}
