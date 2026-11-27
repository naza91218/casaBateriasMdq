/**
 * Lector mínimo de robots.txt: toma las reglas del grupo `User-agent: *` (y del nuestro, si
 * aparece) y responde si una ruta se puede pedir. Gana la regla más larga; Allow gana empates.
 */
export interface Reglas {
  permitir: string[];
  prohibir: string[];
  esperaSegundos: number | null;
}

export function leerRobots(texto: string, agente: string): Reglas {
  const reglas: Reglas = { permitir: [], prohibir: [], esperaSegundos: null };
  const nuestro = agente.toLowerCase();
  let aplica = false;
  let grupoAbierto = false;
  for (const linea of texto.split(/\r?\n/)) {
    const limpia = linea.replace(/#.*/, '').trim();
    const sep = limpia.indexOf(':');
    if (sep < 0) continue;
    const campo = limpia.slice(0, sep).trim().toLowerCase();
    const valor = limpia.slice(sep + 1).trim();
    if (campo === 'user-agent') {
      // Varias líneas User-agent seguidas forman un mismo grupo.
      if (!grupoAbierto) aplica = false;
      grupoAbierto = true;
      const ua = valor.toLowerCase();
      if (ua === '*' || nuestro.includes(ua)) aplica = true;
      continue;
    }
    grupoAbierto = false;
    if (!aplica) continue;
    if (campo === 'allow' && valor) reglas.permitir.push(valor);
    if (campo === 'disallow' && valor) reglas.prohibir.push(valor);
    if (campo === 'crawl-delay' && Number(valor) > 0) reglas.esperaSegundos = Number(valor);
  }
  return reglas;
}

function coincide(patron: string, ruta: string): boolean {
  const ancla = patron.endsWith('$');
  const cuerpo = (ancla ? patron.slice(0, -1) : patron)
    .split('*')
    .map((p) => p.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*');
  return new RegExp(`^${cuerpo}${ancla ? '$' : ''}`).test(ruta);
}

export function sePuede(reglas: Reglas, ruta: string): boolean {
  const largo = (lista: string[]) =>
    Math.max(-1, ...lista.filter((p) => coincide(p, ruta)).map((p) => p.length));
  return largo(reglas.permitir) >= largo(reglas.prohibir);
}
