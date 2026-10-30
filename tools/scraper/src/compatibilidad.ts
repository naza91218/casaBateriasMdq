import type { FilaCompatibilidad } from './planillas.js';

/**
 * Modelos conocidos → marca y nombre prolijo. Las fuentes escriben "F. Palio", "VW.Gol",
 * "P 208", "Gol trend": se normaliza y se busca el modelo más largo que coincida.
 */
const MODELOS: Record<string, [marca: string, modelo: string]> = {};
const agregar = (marca: string, modelos: string[]) => {
  for (const m of modelos) MODELOS[normalizar(m)] = [marca, m];
};

agregar('Volkswagen', ['Gol', 'Gol Trend', 'Fox', 'Up', 'Amarok', 'Saveiro', 'Voyage', 'Suran', 'Bora', 'Vento', 'Polo', 'Golf', 'Passat']);
agregar('Peugeot', ['106', '205', '206', '207', '208', '306', '307', '308', '405', '408', '504', '2008', 'Partner', 'Boxer', 'Expert']);
agregar('Renault', ['Clio', 'Clio Mio', 'Kangoo', 'Logan', 'Sandero', 'Duster', 'Megane', 'Symbol', 'Twingo', 'Master', 'Trafic']);
agregar('Fiat', ['Palio', 'Siena', 'Uno', 'Argo', 'Cronos', 'Fiorino', 'Ducato', 'Strada', 'Toro', 'Punto', 'Idea', 'Mobi']);
agregar('Chevrolet', ['Classic', 'Corsa', 'Onix', 'Prisma', 'Spin', 'S10', 'Blazer', 'C10', 'Aveo', 'Cruze', 'Agile', 'Celta', 'Tracker', 'Spark']);
agregar('Ford', ['Ka', 'Fiesta', 'Focus', 'EcoSport', 'Ranger', 'F100', 'F150', 'F350', 'Cargo', 'Mondeo', 'Escort', 'Transit']);
agregar('Toyota', ['Corolla', 'Etios', 'Yaris', 'Hilux', 'SW4', 'RAV4']);
agregar('Honda', ['Fit', 'Civic', 'Accord', 'HR-V', 'City', 'CR-V']);
agregar('Hyundai', ['i30', 'Atos', 'Tucson', 'Accent']);
agregar('Nissan', ['Frontier', 'March', 'Versa', 'Sentra', 'Kicks']);
agregar('Suzuki', ['Swift']);
agregar('Mitsubishi', ['Montero', 'L200']);
agregar('Dodge', ['RAM']);
agregar('Mercedes-Benz', ['Sprinter', '1114', '1516']);
agregar('Jeep', ['Renegade', 'Compass']);
agregar('Citroën', ['C3', 'C4', 'Berlingo']);

/** Cómo escriben las fuentes algunos modelos. */
const ALIAS: Record<string, string> = {
  voyager: 'voyage',
  'hyundai 130': 'i30',
  hrv: 'hr v',
  'ecosport kinecit': 'ecosport',
};

/** Prefijos de marca que se descartan antes de buscar el modelo ("VW Gol", "F. Palio", "P 208"). */
const PREFIJOS = /^(vw|volkswagen|f|fiat|r|renault|p|peugeot|ch|chev|chevrolet|gm|ford|toyota|honda|hyundai|nissan|mb|mercedes( benz)?|citroen|jeep|bmw|dodge|mitsubishi|iveco|scania)\b\.?\s*/;

export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[._]/g, ' ')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface AutoDetectado {
  marca: string;
  modelo: string;
  motor: string;
  textoOriginal: string;
}

/** Cilindrada y tipo si el texto los trae: "Siena 1.7 TD" → "1.7 TD". */
function motorDe(texto: string): string {
  return texto.match(/\b\d\.\d\b(\s*(TDI|TD|HDI|16V|8V|nafta|di[eé]sel|D)\b)?/i)?.[0] ?? '';
}

/** Un fragmento ("R. Clio 1.2", "Focus 1.8") → marca, modelo y motor. */
export function detectarAuto(fragmento: string): AutoDetectado | null {
  let texto = normalizar(fragmento);
  for (const [alias, real] of Object.entries(ALIAS)) {
    if (texto === alias || texto.startsWith(`${alias} `)) texto = real + texto.slice(alias.length);
  }
  const sinMarca = texto.replace(PREFIJOS, '');
  for (const candidato of [sinMarca, texto]) {
    const palabras = candidato.split(' ');
    for (let n = Math.min(3, palabras.length); n >= 1; n--) {
      const clave = palabras.slice(0, n).join(' ');
      const conocido = MODELOS[clave] ?? MODELOS[ALIAS[clave] ?? ''];
      if (conocido) return { marca: conocido[0], modelo: conocido[1], motor: motorDe(fragmento), textoOriginal: fragmento.trim() };
    }
  }
  return null;
}

const MARCA_EN_EL_MEDIO =
  /\s(?=(VW|Volkswagen|Fiat|Renault|Peugeot|Chevrolet|Ford|Toyota|Honda|Hyundai|Nissan|Citroen|Jeep|BMW|Dodge|Mitsubishi|Iveco|Scania)\s)/gi;

/**
 * Texto libre de aplicaciones → un fragmento por auto: "P 208/308 Fiat Argo-Cronos" da "P 208",
 * "308", "Fiat Argo" y "Cronos". La marca de cada uno la pone después el diccionario de modelos.
 */
export function fragmentar(texto: string): string[] {
  // "2012/16" es un rango de años, no dos autos.
  const protegido = texto.replace(/\b((?:19|20)\d{2})\/(\d{2,4})\b/g, '$1~$2');
  return protegido
    .split(/\s+-\s+|;|,|\s+y\s+/i)
    .flatMap((bloque) => bloque.replace(MARCA_EN_EL_MEDIO, '|').split(/\||\/|-(?=[A-Za-z])/))
    .map((p) => p.trim())
    .filter((p) => p.length > 1);
}

/**
 * Junta los autos de todos los productos en filas de compatibilidad. Un mismo auto que aparece
 * con varias medidas queda en una sola fila con `medidas` "12x45|12x65", porque la importación
 * reemplaza las medidas del vehículo con las de su fila.
 */
export class AcumuladorCompatibilidades {
  private readonly filas = new Map<string, { auto: AutoDetectado; medidas: Set<string>; fuentes: Set<string>; textos: Set<string> }>();
  readonly sinReconocer: { texto: string; medida: string; fuente: string }[] = [];

  agregar(fragmentos: string[], medidaProducto: string, fuente: string): void {
    for (const f of fragmentos) {
      const auto = detectarAuto(f);
      if (!auto) {
        this.sinReconocer.push({ texto: f, medida: medidaProducto, fuente });
        continue;
      }
      const clave = `${auto.marca}|${auto.modelo}|${auto.motor}`.toLowerCase();
      const fila = this.filas.get(clave) ?? { auto, medidas: new Set<string>(), fuentes: new Set<string>(), textos: new Set<string>() };
      if (medidaProducto) fila.medidas.add(medidaProducto);
      fila.fuentes.add(fuente);
      fila.textos.add(auto.textoOriginal);
      this.filas.set(clave, fila);
    }
  }

  resultado(): FilaCompatibilidad[] {
    const listas: FilaCompatibilidad[] = [...this.filas.values()].map((f) => ({
      marca_auto: f.auto.marca,
      modelo: f.auto.modelo,
      anio_desde: '',
      anio_hasta: '',
      motor: f.auto.motor,
      medidas: [...f.medidas].sort(porAmperes).join('|'),
      fuente: [...f.fuentes].join(' | '),
      texto_original: [...f.textos].join(' | '),
    }));
    // Lo no reconocido va al final, sin marca, para que Juan lo complete o lo borre.
    const dudosas = this.sinReconocer.map((s) => ({
      marca_auto: '',
      modelo: s.texto,
      anio_desde: '',
      anio_hasta: '',
      motor: '',
      medidas: s.medida,
      fuente: s.fuente,
      texto_original: s.texto,
    }));
    return [...listas.sort((a, b) => `${a.marca_auto} ${a.modelo}`.localeCompare(`${b.marca_auto} ${b.modelo}`, 'es')), ...dudosas];
  }
}

const porAmperes = (a: string, b: string) => Number(a.split('x')[1]) - Number(b.split('x')[1]);
