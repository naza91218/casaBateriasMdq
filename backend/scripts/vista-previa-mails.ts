import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { eventosConPlantilla, renderizar } from '../src/modules/notificaciones/plantillas/index.js';
import { DATOS_MAIL_DE_EJEMPLO } from '../tests/setup/datos-mail.js';

/**
 * Genera cada mail con datos de ejemplo en `.previews/` para revisarlos en el navegador o
 * mostrárselos al cliente sin hacer pedidos de prueba: `pnpm --filter backend mails:preview`.
 */
const SALIDA = '.previews';
await mkdir(SALIDA, { recursive: true });

const indice: string[] = [];
for (const evento of eventosConPlantilla()) {
  const m = await renderizar(evento, DATOS_MAIL_DE_EJEMPLO);
  await writeFile(join(SALIDA, `${evento}.html`), m.html);
  await writeFile(join(SALIDA, `${evento}.txt`), `Asunto: ${m.asunto}\n\n${m.texto}`);
  indice.push(
    `<li><a href="${evento}.html">${m.asunto}</a> · <a href="${evento}.txt">texto</a></li>`,
  );
}
await writeFile(
  join(SALIDA, 'index.html'),
  `<!doctype html><meta charset="utf-8"><title>Mails</title><h1>Mails de la tienda</h1><ul>${indice.join('')}</ul>`,
);
console.log(`Listo: abrí ${join(process.cwd(), SALIDA, 'index.html')}`);
