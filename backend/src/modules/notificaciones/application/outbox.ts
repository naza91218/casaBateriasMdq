import { and, asc, eq, lte } from 'drizzle-orm';
import type { BaseDeDatos, Ejecutor } from '../../../platform/db.js';
import type { Reloj } from '../../../shared-kernel/reloj.js';
import { MINUTO } from '../../../shared-kernel/reloj.js';
import { outboxMensajes } from '../infrastructure/schema.js';

export type MensajeOutbox = typeof outboxMensajes.$inferSelect;

export interface NuevoMensaje {
  /** Clave de idempotencia: el mismo evento se encola una sola vez (FR-040). */
  clave: string;
  canal: 'mail' | 'revalidacion';
  evento: string;
  destinatario: 'comprador' | 'admin' | 'sistema';
  pedidoId?: string | null;
  datos: Record<string, unknown>;
}

export const MAX_INTENTOS = 8;
const ESPERAS = [1, 5, 15, 60].map((m) => m * MINUTO);

/** Espera antes del próximo intento: 1, 5, 15 y después 60 minutos. */
export function esperaTrasIntento(intentos: number): number {
  return ESPERAS[Math.min(intentos, ESPERAS.length) - 1] ?? 60 * MINUTO;
}

/** Saca mails y datos personales del texto de error antes de guardarlo. */
function errorSeguro(error: unknown): string {
  const texto = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  return texto.replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[mail]').replace(/\d{7,}/g, '[número]').slice(0, 300);
}

export class Outbox {
  constructor(
    private readonly db: BaseDeDatos,
    private readonly reloj: Reloj,
  ) {}

  /**
   * Se llama dentro de la transacción del cambio que origina el mensaje.
   * Devuelve false si ya existía un mensaje con la misma clave.
   */
  async encolar(ejecutor: Ejecutor, mensaje: NuevoMensaje): Promise<boolean> {
    const filas = await ejecutor
      .insert(outboxMensajes)
      .values({
        clave: mensaje.clave,
        canal: mensaje.canal,
        evento: mensaje.evento,
        destinatario: mensaje.destinatario,
        pedidoId: mensaje.pedidoId ?? null,
        datos: mensaje.datos,
        proximoIntentoEn: this.reloj.ahora(),
      })
      .onConflictDoNothing({ target: outboxMensajes.clave })
      .returning({ id: outboxMensajes.id });
    return filas.length > 0;
  }

  /**
   * Toma hasta `limite` mensajes listos, bloqueándolos para que otro worker no los tome
   * (FOR UPDATE SKIP LOCKED), y los procesa con `manejador`.
   */
  async procesarLote(
    manejador: (mensaje: MensajeOutbox) => Promise<void>,
    limite = 10,
  ): Promise<{ enviados: number; reintentos: number; fallidos: number }> {
    const ahora = this.reloj.ahora();
    const resultado = { enviados: 0, reintentos: 0, fallidos: 0 };
    await this.db.transaction(async (tx) => {
      const listos = await tx
        .select()
        .from(outboxMensajes)
        .where(and(eq(outboxMensajes.estado, 'pendiente'), lte(outboxMensajes.proximoIntentoEn, ahora)))
        .orderBy(asc(outboxMensajes.creadoEn))
        .limit(limite)
        .for('update', { skipLocked: true });

      for (const mensaje of listos) {
        const intentos = mensaje.intentos + 1;
        try {
          await manejador(mensaje);
          await tx
            .update(outboxMensajes)
            .set({ estado: 'enviado', intentos, enviadoEn: ahora, ultimoError: null })
            .where(eq(outboxMensajes.id, mensaje.id));
          resultado.enviados++;
        } catch (error) {
          const agotado = intentos >= MAX_INTENTOS;
          await tx
            .update(outboxMensajes)
            .set({
              estado: agotado ? 'fallido' : 'pendiente',
              intentos,
              ultimoError: errorSeguro(error),
              proximoIntentoEn: new Date(ahora.getTime() + esperaTrasIntento(intentos)),
            })
            .where(eq(outboxMensajes.id, mensaje.id));
          if (agotado) resultado.fallidos++;
          else resultado.reintentos++;
        }
      }
    });
    return resultado;
  }
}
