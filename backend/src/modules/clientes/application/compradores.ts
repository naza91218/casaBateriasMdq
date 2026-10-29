import { eq } from 'drizzle-orm';
import type { Cifrador } from '../../../platform/crypto.js';
import type { Ejecutor } from '../../../platform/db.js';
import { pedidoCompradores } from '../infrastructure/schema.js';

export interface DatosNuevoComprador {
  nombre: string;
  dni: string;
  telefono: string;
  email: string;
  calle?: string | undefined;
  numero?: string | undefined;
  referencias?: string | undefined;
}

export interface CompradorParaPanel extends DatosNuevoComprador {
  anonimizado: boolean;
}

/** Datos del comprador. El DNI sale descifrado solo hacia el panel (FR-059). */
export class ServicioCompradores {
  constructor(private readonly cifrador: Cifrador) {}

  async guardar(ej: Ejecutor, pedidoId: string, d: DatosNuevoComprador): Promise<void> {
    const dni = this.cifrador.cifrar(d.dni);
    await ej.insert(pedidoCompradores).values({
      pedidoId,
      nombre: d.nombre,
      dniCifrado: dni.datos,
      dniClaveVersion: dni.version,
      telefono: d.telefono,
      email: d.email,
      calle: d.calle ?? null,
      numero: d.numero ?? null,
      referencias: d.referencias ?? null,
    });
  }

  /** Lo mínimo para mandar mails: nombre y mail. Nunca el DNI (FR-038). */
  async contacto(ej: Ejecutor, pedidoId: string): Promise<{ nombre: string; email: string } | null> {
    const [c] = await ej
      .select({ nombre: pedidoCompradores.nombre, email: pedidoCompradores.email })
      .from(pedidoCompradores)
      .where(eq(pedidoCompradores.pedidoId, pedidoId));
    return c ?? null;
  }

  /** Solo para el panel del administrador. */
  async paraPanel(ej: Ejecutor, pedidoId: string): Promise<CompradorParaPanel | null> {
    const [c] = await ej.select().from(pedidoCompradores).where(eq(pedidoCompradores.pedidoId, pedidoId));
    if (!c) return null;
    return {
      nombre: c.nombre,
      dni: c.anonimizadoEn ? '' : this.cifrador.descifrar(c.dniCifrado, c.dniClaveVersion),
      telefono: c.telefono,
      email: c.email,
      calle: c.calle ?? undefined,
      numero: c.numero ?? undefined,
      referencias: c.referencias ?? undefined,
      anonimizado: c.anonimizadoEn !== null,
    };
  }
}
