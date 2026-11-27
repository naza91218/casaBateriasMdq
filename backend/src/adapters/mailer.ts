import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import type { Mailer, MensajeMail } from '../shared-kernel/puertos.js';

/** Desarrollo: SMTP a Mailpit (http://localhost:8025). Nada sale a internet. */
export class MailerDev implements Mailer {
  private readonly transporte;

  constructor(
    private readonly remitente: string,
    host: string,
    port: number,
  ) {
    this.transporte = nodemailer.createTransport({ host, port, secure: false });
  }

  async enviar(m: MensajeMail): Promise<void> {
    await this.transporte.sendMail({
      from: this.remitente,
      to: m.para,
      subject: m.asunto,
      html: m.html,
      text: m.texto,
    });
  }
}

/** Staging y producción: Resend con el dominio del negocio (FR-039). */
export class MailerResend implements Mailer {
  private readonly cliente: Resend;

  constructor(
    apiKey: string,
    private readonly remitente: string,
    /** En staging solo se permiten estos destinatarios (research R11). */
    private readonly permitidos?: string[],
  ) {
    this.cliente = new Resend(apiKey);
  }

  async enviar(m: MensajeMail): Promise<void> {
    if (this.permitidos && !this.permitidos.includes(m.para.toLowerCase())) return;
    const { error } = await this.cliente.emails.send({
      from: this.remitente,
      to: m.para,
      subject: m.asunto,
      html: m.html,
      text: m.texto,
    });
    if (error) throw new Error(`Resend: ${error.name}`);
  }
}

/** Tests: guarda los mails en memoria. Puede simular una caída (US4-04). */
export class MailerFalso implements Mailer {
  readonly enviados: MensajeMail[] = [];
  caido = false;

  async enviar(m: MensajeMail): Promise<void> {
    if (this.caido) throw new Error('Servicio de mails caído');
    this.enviados.push(m);
  }
}
