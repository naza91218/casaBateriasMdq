import { and, eq, gt, isNull, ne } from 'drizzle-orm';
import type { BaseDeDatos } from '../../../platform/db.js';
import { hashClave, hashToken, tokenAleatorio, verificarClave } from '../../../platform/crypto.js';
import { ErrorDeDominio } from '../../../shared-kernel/errores.js';
import type { Reloj } from '../../../shared-kernel/reloj.js';
import { DIA, MINUTO } from '../../../shared-kernel/reloj.js';
import type { Outbox } from '../../notificaciones/application/outbox.js';
import { enlacesIngreso, sesiones, usuariosPanel } from '../infrastructure/schema.js';

export const VIGENCIA_ENLACE = 15 * MINUTO;
export const VIGENCIA_SESION = 30 * DIA;

export const LARGO_MINIMO_CLAVE = 10;

export interface UsuarioPanel {
  id: string;
  email: string;
  rol: string;
}

/** Para igualar el tiempo de respuesta cuando el mail no existe o no tiene contraseña. */
let hashDeRelleno: Promise<string> | null = null;

/**
 * Ingreso al panel con mail y contraseña, o con enlace por mail (primera vez o contraseña
 * olvidada) (FR-041). Solo se guardan hashes; el token y el id de sesión en claro viajan una
 * sola vez.
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
      return this.abrirSesion(tx, enlace.usuarioId);
    });
  }

  /**
   * Mail y contraseña. Mismo resultado (null) si el mail no existe, no tiene contraseña o la
   * contraseña no coincide, y en un tiempo parecido: no revela qué mails están autorizados.
   */
  async ingresarConClave(
    email: string,
    clave: string,
  ): Promise<{ idSesion: string; venceEn: Date } | null> {
    const [usuario] = await this.db
      .select({ id: usuariosPanel.id, claveHash: usuariosPanel.claveHash })
      .from(usuariosPanel)
      .where(and(eq(usuariosPanel.email, email.trim()), eq(usuariosPanel.activo, true)));
    if (!usuario?.claveHash) {
      hashDeRelleno ??= hashClave('relleno-para-igualar-tiempos');
      await verificarClave(clave, await hashDeRelleno);
      return null;
    }
    if (!(await verificarClave(clave, usuario.claveHash))) return null;
    return this.abrirSesion(this.db, usuario.id);
  }

  async tieneClave(usuarioId: string): Promise<boolean> {
    const [fila] = await this.db
      .select({ claveHash: usuariosPanel.claveHash })
      .from(usuariosPanel)
      .where(eq(usuariosPanel.id, usuarioId));
    return Boolean(fila?.claveHash);
  }

  /**
   * Pone o cambia la contraseña. Si ya tenía una, pide la actual. Cierra las demás sesiones del
   * usuario: si alguien más había entrado, queda afuera.
   */
  async cambiarClave(
    usuarioId: string,
    idSesionActual: string,
    datos: { actual?: string | undefined; nueva: string },
  ): Promise<void> {
    if (datos.nueva.length < LARGO_MINIMO_CLAVE) {
      throw new ErrorDeDominio(
        'validacion',
        'CLAVE_CORTA',
        `La contraseña tiene que tener al menos ${LARGO_MINIMO_CLAVE} caracteres`,
        { nueva: `Al menos ${LARGO_MINIMO_CLAVE} caracteres` },
      );
    }
    const [usuario] = await this.db
      .select({ claveHash: usuariosPanel.claveHash })
      .from(usuariosPanel)
      .where(eq(usuariosPanel.id, usuarioId));
    if (usuario?.claveHash) {
      const ok = datos.actual ? await verificarClave(datos.actual, usuario.claveHash) : false;
      if (!ok) {
        throw new ErrorDeDominio(
          'validacion',
          'CLAVE_ACTUAL',
          'La contraseña actual no es correcta',
          {
            actual: 'No es correcta',
          },
        );
      }
    }
    const claveHash = await hashClave(datos.nueva);
    const ahora = this.reloj.ahora();
    await this.db.transaction(async (tx) => {
      await tx.update(usuariosPanel).set({ claveHash }).where(eq(usuariosPanel.id, usuarioId));
      await tx
        .update(sesiones)
        .set({ revocadaEn: ahora })
        .where(
          and(
            eq(sesiones.usuarioId, usuarioId),
            isNull(sesiones.revocadaEn),
            ne(sesiones.idHash, hashToken(idSesionActual)),
          ),
        );
    });
  }

  /**
   * Solo la demo (DEMO_INGRESO_DIRECTO): sesión sin enlace por mail, para un usuario activo.
   * La configuración no deja activarlo en staging ni en producción.
   */
  async ingresoDirecto(email: string): Promise<{ idSesion: string; venceEn: Date } | null> {
    const [usuario] = await this.db
      .select({ id: usuariosPanel.id })
      .from(usuariosPanel)
      .where(and(eq(usuariosPanel.email, email.trim()), eq(usuariosPanel.activo, true)));
    return usuario ? this.abrirSesion(this.db, usuario.id) : null;
  }

  private async abrirSesion(
    db: Pick<BaseDeDatos, 'insert'>,
    usuarioId: string,
  ): Promise<{ idSesion: string; venceEn: Date }> {
    const idSesion = tokenAleatorio();
    const venceEn = new Date(this.reloj.ahora().getTime() + VIGENCIA_SESION);
    await db.insert(sesiones).values({ idHash: hashToken(idSesion), usuarioId, venceEn });
    return { idSesion, venceEn };
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
