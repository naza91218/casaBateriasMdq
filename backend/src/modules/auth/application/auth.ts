import { and, eq, gt, isNull } from 'drizzle-orm';
import type { BaseDeDatos } from '../../../platform/db.js';
import { hashToken, tokenAleatorio } from '../../../platform/crypto.js';
import type { Reloj } from '../../../shared-kernel/reloj.js';
import { DIA, MINUTO } from '../../../shared-kernel/reloj.js';
import type { Outbox } from '../../notificaciones/application/outbox.js';
import { enlacesIngreso, sesiones, usuariosPanel } from '../infrastructure/schema.js';

export const VIGENCIA_ENLACE = 15 * MINUTO;
export const VIGENCIA_SESION = 30 * DIA;

export interface UsuarioPanel {
  id: string;
  email: string;
  rol: string;
}

/**
 * Ingreso al panel por enlace mágico (research R4, FR-041).
 * Solo se guardan hashes; el token y el id de sesión en claro viajan una sola vez.
 */
export class ServicioAuth {
  constructor(
    private readonly db: BaseDeDatos,
    private readonly outbox: Outbox,
    private readonly reloj: Reloj,
    private readonly urlApi: string,
  ) {}

  /**
   * Siempre termina igual para el que llama, exista o no el mail (US3-02): no revela qué
   * mails están autorizados.
   */
  async pedirEnlace(email: string): Promise<void> {
    const [usuario] = await this.db
      .select({ id: usuariosPanel.id, email: usuariosPanel.email })
      .from(usuariosPanel)
      .where(and(eq(usuariosPanel.email, email.trim()), eq(usuariosPanel.activo, true)));
    if (!usuario) return;

    const token = tokenAleatorio();
    const tokenHash = hashToken(token);
    const url = `${this.urlApi}/api/v1/auth/verificar?token=${token}`;
    await this.db.transaction(async (tx) => {
      await tx.insert(enlacesIngreso).values({
        tokenHash,
        usuarioId: usuario.id,
        venceEn: new Date(this.reloj.ahora().getTime() + VIGENCIA_ENLACE),
      });
      await this.outbox.encolar(tx, {
        clave: `enlace_ingreso:${tokenHash}`,
        canal: 'mail',
        evento: 'enlace_ingreso',
        destinatario: 'comprador',
        datos: { email: usuario.email, url },
      });
    });
  }

  /** Canjea el enlace (una sola vez, antes de que venza) por una sesión de 30 días. */
  async verificarEnlace(token: string): Promise<{ idSesion: string; venceEn: Date } | null> {
    const ahora = this.reloj.ahora();
    return this.db.transaction(async (tx) => {
      const [enlace] = await tx
        .update(enlacesIngreso)
        .set({ usadoEn: ahora })
        .where(
          and(
            eq(enlacesIngreso.tokenHash, hashToken(token)),
            isNull(enlacesIngreso.usadoEn),
            gt(enlacesIngreso.venceEn, ahora),
          ),
        )
        .returning({ usuarioId: enlacesIngreso.usuarioId });
      if (!enlace) return null;

      const idSesion = tokenAleatorio();
      const venceEn = new Date(ahora.getTime() + VIGENCIA_SESION);
      await tx.insert(sesiones).values({ idHash: hashToken(idSesion), usuarioId: enlace.usuarioId, venceEn });
      return { idSesion, venceEn };
    });
  }

  async usuarioDeSesion(idSesion: string): Promise<UsuarioPanel | null> {
    const [fila] = await this.db
      .select({ id: usuariosPanel.id, email: usuariosPanel.email, rol: usuariosPanel.rol })
      .from(sesiones)
      .innerJoin(usuariosPanel, eq(usuariosPanel.id, sesiones.usuarioId))
      .where(
        and(
          eq(sesiones.idHash, hashToken(idSesion)),
          isNull(sesiones.revocadaEn),
          gt(sesiones.venceEn, this.reloj.ahora()),
          eq(usuariosPanel.activo, true),
        ),
      );
    return fila ?? null;
  }

  async cerrarSesion(idSesion: string): Promise<void> {
    await this.db
      .update(sesiones)
      .set({ revocadaEn: this.reloj.ahora() })
      .where(eq(sesiones.idHash, hashToken(idSesion)));
  }
}
