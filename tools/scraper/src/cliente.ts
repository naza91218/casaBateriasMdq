import { leerRobots, sePuede, type Reglas } from './robots.js';

export const AGENTE = 'CasaDeLasBaterias-Catalogo/1.0 (carga inicial de catálogo; contacto: nazareno200406@gmail.com)';
const ESPERA_MINIMA_MS = 2_000;

/**
 * Cliente HTTP "educado" (research R10): respeta robots.txt, hace como mucho un pedido cada
 * 2 s por sitio (o más si el sitio lo pide), se identifica y reintenta poco.
 */
export class ClienteEducado {
  private readonly robots = new Map<string, Reglas>();
  private readonly ultimoPedido = new Map<string, number>();

  constructor(
    private readonly opciones: { esperaMs?: number; log?: (m: string) => void; fetch?: typeof fetch } = {},
  ) {}

  async texto(url: string): Promise<string> {
    return (await this.pedir(url)).text();
  }

  async binario(url: string): Promise<Buffer> {
    return Buffer.from(await (await this.pedir(url)).arrayBuffer());
  }

  private async pedir(url: string, intento = 1): Promise<Response> {
    const destino = new URL(url);
    const reglas = await this.reglasDe(destino.origin);
    if (!sePuede(reglas, destino.pathname + destino.search)) {
      throw new Error(`robots.txt no permite ${destino.pathname}`);
    }
    await this.esperarTurno(destino.origin, reglas);
    this.opciones.log?.(`GET ${url}`);
    const r = await this.hacerFetch(url);
    if (r.ok) return r;
    if (intento < 3 && (r.status === 429 || r.status >= 500)) return this.pedir(url, intento + 1);
    throw new Error(`${url} respondió ${r.status}`);
  }

  private async reglasDe(origen: string): Promise<Reglas> {
    const guardadas = this.robots.get(origen);
    if (guardadas) return guardadas;
    let reglas: Reglas = { permitir: [], prohibir: [], esperaSegundos: null };
    await this.esperarTurno(origen, reglas);
    const r = await this.hacerFetch(`${origen}/robots.txt`);
    if (r.ok) reglas = leerRobots(await r.text(), AGENTE);
    this.robots.set(origen, reglas);
    return reglas;
  }

  private async esperarTurno(origen: string, reglas: Reglas): Promise<void> {
    const espera = Math.max(this.opciones.esperaMs ?? ESPERA_MINIMA_MS, (reglas.esperaSegundos ?? 0) * 1000);
    const falta = (this.ultimoPedido.get(origen) ?? 0) + espera - Date.now();
    if (falta > 0) await new Promise((r) => setTimeout(r, falta));
    this.ultimoPedido.set(origen, Date.now());
  }

  private hacerFetch(url: string): Promise<Response> {
    return (this.opciones.fetch ?? fetch)(url, {
      headers: { 'user-agent': AGENTE, accept: 'text/html,application/xml,image/*;q=0.9,*/*;q=0.5' },
      signal: AbortSignal.timeout(30_000),
    });
  }
}
