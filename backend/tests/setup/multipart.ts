import { randomBytes } from 'node:crypto';

/** Arma un cuerpo multipart/form-data para `app.inject` (campos de texto y archivos). */
export function multipart(
  campos: Record<string, string>,
  archivos: { campo: string; nombre: string; tipo: string; contenido: Buffer }[],
): { payload: Buffer; headers: Record<string, string> } {
  const limite = `----prueba${randomBytes(8).toString('hex')}`;
  const partes: Buffer[] = [];
  for (const [campo, valor] of Object.entries(campos)) {
    partes.push(Buffer.from(`--${limite}\r\nContent-Disposition: form-data; name="${campo}"\r\n\r\n${valor}\r\n`));
  }
  for (const a of archivos) {
    partes.push(
      Buffer.from(
        `--${limite}\r\nContent-Disposition: form-data; name="${a.campo}"; filename="${a.nombre}"\r\nContent-Type: ${a.tipo}\r\n\r\n`,
      ),
      a.contenido,
      Buffer.from('\r\n'),
    );
  }
  partes.push(Buffer.from(`--${limite}--\r\n`));
  return { payload: Buffer.concat(partes), headers: { 'content-type': `multipart/form-data; boundary=${limite}` } };
}
