import { readFile } from 'node:fs/promises';
import { medida, type FilaProducto } from '../planillas.js';

/**
 * Catálogo oficial de Sermat en PDF ("Listado de modelos por marcas"), que pasó el cliente.
 * - Páginas de compatibilidad: columna de modelos, batería estándar y opcional; cada sección
 *   empieza con el nombre de la marca del auto en otra tipografía.
 * - Página de "Modelos y medidas": ficha técnica de cada batería.
 * El texto se lee con su posición para reconstruir las filas de las tablas.
 */
export interface TextoPdf {
  x: number;
  y: number;
  texto: string;
  fuente: string;
}

export async function leerTextosPdf(ruta: string): Promise<TextoPdf[][]> {
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await getDocument({ data: new Uint8Array(await readFile(ruta)), verbosity: 0 })
    .promise;
  const paginas: TextoPdf[][] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const contenido = await (await doc.getPage(n)).getTextContent();
    paginas.push(
      contenido.items.flatMap((i) =>
        'str' in i && i.str.trim()
          ? [
              {
                x: i.transform[4] as number,
                y: i.transform[5] as number,
                texto: limpiar(i.str),
                fuente: i.fontName,
              },
            ]
          : [],
      ),
    );
  }
  return paginas;
}

/** El PDF usa un carácter de control (U+001F) donde va el guion: "CR\u001fV" → "CR-V". */
export function limpiar(texto: string): string {
  return texto.replaceAll(String.fromCharCode(0x1f), '-').replace(/\s+/g, ' ').trim();
}

/** Agrupa los textos en renglones (misma altura, con tolerancia), de arriba hacia abajo. */
export function renglones(textos: TextoPdf[], tolerancia = 3): TextoPdf[][] {
  const filas: { y: number; textos: TextoPdf[] }[] = [];
  for (const t of [...textos].sort((a, b) => b.y - a.y)) {
    const fila = filas.find((f) => Math.abs(f.y - t.y) <= tolerancia);
    if (fila) fila.textos.push(t);
    else filas.push({ y: t.y, textos: [t] });
  }
  return filas.map((f) => f.textos.sort((a, b) => a.x - b.x));
}

// Columnas de las páginas de compatibilidad (puntos PDF desde la izquierda).
const COL_MODELO = 160;
const COL_ESTANDAR = 420;
const COL_OPCIONAL = 495;

export interface FilaCatalogo {
  marca: string;
  modelos: string;
  estandar: string | null;
  opcional: string | null;
}

/** Secciones que no son del rubro (autos, camionetas y camiones). */
const SECCIONES_EXCLUIDAS = /^(tractores|m[aá]quinas viales)/i;

const NOMBRES_DE_MARCA: Record<string, string> = {
  Citröen: 'Citroën',
  'Mercedes Benz': 'Mercedes-Benz',
};

/**
 * "12- 75 BD" → "12-75 BD"; "12/75 AD" → "12-75 AD"; "-" (sin opcional) → null. En el PDF la
 * "I" de "12-65 I" (polo izquierdo) a veces sale como "1": "12-651" → "12-65 I".
 */
export function normalizarCodigo(texto: string): string | null {
  const c = texto
    .replace(/\*/g, '')
    .replace(/\//g, '-')
    .replace(/\s*-\s*/g, '-')
    .replace(/^(\d+-\d+)\s*([A-Z]+)$/, '$1 $2')
    .replace(/^(\d+-\d{2,3})1$/, (todo, base: string) =>
      Number(base.split('-')[1]) <= 250 && todo.length > base.length ? `${base} I` : todo,
    )
    .trim();
  return c && c !== '-' ? c : null;
}

/** Medida comercial del código: "12-75 BD" → "12x75". Las NS (japonesas) y las de 6 V no tienen. */
export function medidaDeCodigo(codigo: string): string | null {
  const m = codigo.match(/^12-(\d{2,3})\b/);
  return m ? medida(12, Number(m[1])) : null;
}

export function leerCompatibilidades(paginas: TextoPdf[][]): FilaCatalogo[] {
  const filas: FilaCatalogo[] = [];
  // La tipografía de los títulos de marca es la del primer título conocido.
  const todos = paginas.flat();
  const fuenteTitulo = todos.find(
    (t) => t.texto === 'Alfa Romeo' || t.texto === 'Chevrolet',
  )?.fuente;
  for (const pagina of paginas) {
    if (!pagina.some((t) => t.texto === 'ESTANDAR')) continue;
    let marca: string | null = null;
    for (const renglon of renglones(pagina)) {
      const modelo = renglon.filter((t) => t.x >= COL_MODELO && t.x < COL_ESTANDAR);
      if (modelo.length === 0) continue;
      const texto = modelo.map((t) => t.texto).join(' ');
      if (modelo.every((t) => t.fuente === fuenteTitulo)) {
        marca = NOMBRES_DE_MARCA[texto] ?? texto;
        continue;
      }
      if (!marca || SECCIONES_EXCLUIDAS.test(marca) || /MARCA \/ MODELO/.test(texto)) continue;
      const estandar = renglon.find((t) => t.x >= COL_ESTANDAR && t.x < COL_OPCIONAL)?.texto ?? '';
      const opcional = renglon.find((t) => t.x >= COL_OPCIONAL)?.texto ?? '';
      if (!estandar && !opcional) continue;
      filas.push({
        marca,
        modelos: texto,
        estandar: normalizarCodigo(estandar),
        opcional: normalizarCodigo(opcional),
      });
    }
  }
  return filas;
}

/** Algunas letras del PDF salieron mal codificadas ("AYEO", "S0NIC", "(3"): esas filas se marcan. */
export function textoDudoso(texto: string): boolean {
  return /\(\d|[A-Z]0[A-Z]|\b[A-Z]+0\b|\\|\.\.\.|AYEO|OIEROKEE|L0V|\bS00L\b/.test(texto);
}

export interface AutoCatalogo {
  modelo: string;
  motor: string;
  textoOriginal: string;
}

const CALIFICADORES =
  /\b(\d\.\d+\s*(?:16V|8V|T|JTD|TDI|TD)?|TDI|JTD|HDI|TD|DIESEL|NAFTA|V6|V8|TURBO)\b/gi;

const SIGLAS = new Set([
  'LUV',
  'NPR',
  'TT',
  'GT',
  'GTI',
  'RS',
  'SW',
  'XL',
  'CL',
  'ES',
  'AX',
  'BX',
  'ZX',
  'DS',
  'CE',
  'RAM',
  'SUV',
  'BMW',
  'MX',
  'RX',
  'GL',
  'GLX',
  'GLS',
  'SL',
  'SLK',
  'CLK',
]);

/** Modelos de dos letras que son palabras, no siglas. */
const MODELOS_CORTOS = new Set(['UP', 'KA']);

/**
 * Nombre prolijo: "GOL TREND" → "Gol Trend". Códigos ("S10", "CR-V"), siglas ("LUV") y las
 * palabras de dos letras ("FH", "NH") quedan en mayúscula, salvo modelos como "Up" o "Ka".
 */
function prolijo(texto: string): string {
  const siglaOCodigo = (p: string) =>
    /\d|-/.test(p) || SIGLAS.has(p) || (p.length <= 2 && !MODELOS_CORTOS.has(p));
  return texto
    .split(' ')
    .map((p) => (siglaOCodigo(p) ? p : p.charAt(0) + p.slice(1).toLowerCase()))
    .join(' ');
}

/** "33 / 145 / 146 1.8 / SPIDER 2.0" → un auto por fragmento, con cilindrada y combustible como motor. */
export function autosDeFila(modelos: string): AutoCatalogo[] {
  return modelos
    .replace(/^CAMIONES:\s*/i, '')
    .split(/[/,]/)
    .map((f) => f.trim().replace(/\*+$/, ''))
    .filter((f) => f.length > 0 && f !== '-')
    .flatMap((fragmento) => {
      const motor = (fragmento.match(CALIFICADORES) ?? []).join(' ');
      // Las menciones de años ("S10 >2016") quedan en el texto original y la fila se marca para revisar.
      const modelo = fragmento
        .replace(/[<>]\s*\d{4}/g, ' ')
        .replace(CALIFICADORES, ' ')
        .replace(/[>.,]+\s*$/, '')
        .replace(/\s+/g, ' ')
        .trim();
      // Un fragmento que es solo un motor ("V6 3.0") no es un auto.
      if (!modelo || modelo.length < 2) return [];
      return [{ modelo: prolijo(modelo), motor, textoOriginal: fragmento }];
    });
}

export interface ModeloSermat {
  codigo: string;
  largo: number;
  ancho: number;
  alto: number;
  placas: number;
  pesoKg: number;
}

/** Página "Modelos y medidas": MODELO | VOLT. | LARGO | ANCHO | ALTO | PLACAS | PESO. */
export function leerModelos(paginas: TextoPdf[][]): ModeloSermat[] {
  const pagina = paginas.find((p) => p.some((t) => t.texto === 'PLACAS'));
  if (!pagina) return [];
  const encabezado = Object.fromEntries(
    pagina
      .filter((t) => /^(MODELO|LARGO|ANCHO|ALTO|PLACAS|PESO)$/.test(t.texto))
      .map((t) => [t.texto, t.x]),
  );
  const yEncabezado = pagina.find((t) => t.texto === 'MODELO')?.y ?? Infinity;
  const columna = (renglon: TextoPdf[], nombre: string) => {
    const x = encabezado[nombre];
    if (x === undefined) return undefined;
    return renglon.find((t) => Math.abs(t.x - x) < 25)?.texto;
  };
  const numero = (v: string | undefined) => Number((v ?? '').replace(',', '.'));
  return renglones(pagina.filter((t) => t.y < yEncabezado - 5))
    .map((r) => ({
      codigo: columna(r, 'MODELO') ?? '',
      largo: numero(columna(r, 'LARGO')),
      ancho: numero(columna(r, 'ANCHO')),
      alto: numero(columna(r, 'ALTO')),
      placas: numero(columna(r, 'PLACAS')),
      pesoKg: numero(columna(r, 'PESO')),
    }))
    .filter((m) => /^(NS|S\d|\d+\/|VOLTA)/i.test(m.codigo) && m.largo > 0);
}

/** "12/75 B" → 12 V 75 Ah; "VOLTA 50" → 12 V 50 Ah; NS40, S1250C23 y 6/160 no dicen amperaje de 12 V. */
export function amperajeDeModelo(codigo: string): number | null {
  const m = codigo.match(/^12\/(\d{2,3})\b/) ?? codigo.match(/^VOLTA\s+(\d{2,3})$/i);
  return m ? Number(m[1]) : null;
}

export const esDeSeisVolts = (codigo: string) => /^6\//.test(codigo);

export function aFilaProducto(m: ModeloSermat, fuente: string): FilaProducto {
  const ah = amperajeDeModelo(m.codigo);
  const esVolta = /^volta/i.test(m.codigo);
  const marca = esVolta ? 'Volta' : 'Sermat';
  const borne = / A$/.test(m.codigo) ? ' Borne alto.' : / B$/.test(m.codigo) ? ' Borne bajo.' : '';
  return {
    sku: `${marca.toUpperCase()}-${m.codigo
      .toUpperCase()
      .replace(/^VOLTA\s*/, '')
      .replace(/[^A-Z0-9]+/g, '-')}`,
    marca,
    nombre: esVolta ? `Volta ${m.codigo.replace(/^volta\s*/i, '')}` : `Sermat ${m.codigo}`,
    medida: ah ? medida(12, ah) : '',
    amperaje_ah: ah ? String(ah) : '',
    cca: '',
    // Suposición inicial: Volta (segunda marca de Sermat) como económica y Sermat como reforzada.
    gama: esVolta ? 'economica' : 'reforzada',
    descripcion: `Medidas: ${m.largo} x ${m.ancho} x ${m.alto} mm. ${m.placas} placas. Peso: ${String(m.pesoKg).replace('.', ',')} kg.${borne}`,
    precio_lista: '',
    stock: '',
    fotos: '',
    fuente,
  };
}
