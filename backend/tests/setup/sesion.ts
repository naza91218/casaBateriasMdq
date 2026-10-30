import { desc, eq } from 'drizzle-orm';
import type { Contexto } from '../../src/composition-root.js';
import { usuariosPanel } from '../../src/modules/auth/infrastructure/schema.js';
import { outboxMensajes } from '../../src/modules/notificaciones/infrastructure/schema.js';

/** Hace el ingreso completo (pedir enlace → canjearlo) y devuelve la cookie de sesión. */
export async function cookieDeAdmin(ctx: Contexto, email = 'admin@tienda.test'): Promise<{ sesion: string }> {
  await ctx.servicios.auth.pedirEnlace(email);
  const [mail] = await ctx.db
    .select()
    .from(outboxMensajes)
    .where(eq(outboxMensajes.evento, 'enlace_ingreso'))
    .orderBy(desc(outboxMensajes.id))
    .limit(1);
  const token = new URL(String(mail?.datos.url)).searchParams.get('token') ?? '';
  const sesion = await ctx.servicios.auth.verificarEnlace(token);
  if (!sesion) throw new Error('No se pudo crear la sesión de prueba');
  return { sesion: sesion.idSesion };
}

export async function idDeAdmin(ctx: Contexto, email = 'admin@tienda.test'): Promise<string> {
  const [u] = await ctx.db.select({ id: usuariosPanel.id }).from(usuariosPanel).where(eq(usuariosPanel.email, email));
  if (!u) throw new Error(`No existe el usuario ${email}: corré sembrarBase`);
  return u.id;
}
