import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'csv-parse/sync';
import { ClienteEducado } from './cliente.js';
import { AcumuladorCompatibilidades, fragmentar } from './compatibilidad.js';
import * as herbo from './fuentes/herbo.js';
import * as sermatPdf from './fuentes/sermat-pdf.js';
import * as sermatVolta from './fuentes/sermat-volta.js';
import { aCsv, COLUMNAS_COMPATIBILIDADES, COLUMNAS_PRODUCTOS, type FilaProducto } from './planillas.js';

/**
 * Carga inicial del catálogo (research R10, FR-070): baja datos técnicos, autos compatibles y
 * fotos de fuentes públicas y arma las planillas de importación en data/import/. Nunca toca la
 * base: Juan revisa las planillas y las importa desde el panel, donde todo entra "a revisar".
 *
 *   pnpm --filter @casa/scraper scrape                 # todas las fuentes
 *   pnpm --filter @casa/scraper scrape -- --solo herbo  # una sola
 */
const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, '../../..');
const SALIDA = join(RAIZ, 'data', 'import');

const args = process.argv.slice(2);
const solo = args.includes('--solo') ? args[args.indexOf('--solo') + 1] : undefined;
const sinFotos = args.includes('--sin-fotos');

const cliente = new ClienteEducado({ log: (m) => console.log(`  ${m}`) });
const productos: FilaProducto[] = [];
const compat = new AcumuladorCompatibilidades();
const avisos: string[] = [];

async function deHerbo(): Promise<void> {
  console.log('Herbo: leyendo el mapa del sitio…');
  const urls = await herbo.urlsDeFichas(cliente);
  let descartados = 0;
  for (const url of urls) {
    try {
      const ficha = herbo.leerFicha(await cliente.texto(url), url);
      if (!herbo.esDelRubro(ficha)) {
        descartados++;
        continue;
      }
      const ruta = sinFotos || !ficha.foto ? null : await guardarFoto(ficha.foto, 'herbo', ficha.slug);
      const fila = herbo.aFila(ficha, ruta);
      if (!fila.medida) avisos.push(`Herbo "${ficha.nombre}": no se pudo deducir el amperaje (${url})`);
      productos.push(fila);
      compat.agregar(ficha.autos, fila.medida, url);
    } catch (error) {
      avisos.push(`Herbo ${url}: ${(error as Error).message}`);
    }
  }
  console.log(`Herbo: ${urls.length - descartados} baterías del rubro, ${descartados} descartadas (motos, solares, estacionarias…)`);
}

/**
 * Catálogo oficial de Sermat en PDF (lo pasó el cliente): fichas técnicas de Sermat y Volta y la
 * batería estándar y opcional de cada auto, ordenada por marca.
 */
async function deCatalogoSermat(ruta: string): Promise<void> {
  console.log('Sermat y Volta: leyendo el catálogo oficial en PDF…');
  const paginas = await sermatPdf.leerTextosPdf(ruta);
  const fuente = 'Catálogo Sermat (PDF del cliente)';

  const modelos = sermatPdf.leerModelos(paginas).filter((m) => !sermatPdf.esDeSeisVolts(m.codigo));
  for (const m of modelos) {
    const fila = sermatPdf.aFilaProducto(m, fuente);
    if (!fila.medida) avisos.push(`${fila.nombre}: el catálogo no dice su amperaje; completalo en la planilla`);
    productos.push(fila);
  }

  const filas = sermatPdf.leerCompatibilidades(paginas);
  let sinMedida = 0;
  for (const f of filas) {
    const codigos = [f.estandar, f.opcional].filter((c): c is string => c !== null);
    const medidas = codigos.map(sermatPdf.medidaDeCodigo).filter((m): m is string => m !== null);
    if (medidas.length === 0) {
      sinMedida++;
      continue;
    }
    const revisar = [
      sermatPdf.textoDudoso(f.modelos) ? 'El catálogo trae letras mal codificadas: revisá el nombre' : '',
      /[*]/.test(f.modelos) ? 'Tiene notas al pie (*): revisá qué batería va con cada modelo' : '',
      /[<>]\s*\d{4}/.test(f.modelos) ? 'Menciona años: completalos si corresponde' : '',
    ]
      .filter(Boolean)
      .join('; ');
    for (const a of sermatPdf.autosDeFila(f.modelos)) {
      compat.agregarConMarca(
        { marca: f.marca, modelo: a.modelo, motor: a.motor, textoOriginal: `${a.textoOriginal} → ${codigos.join(' / ')}` },
        medidas,
        fuente,
        revisar || null,
      );
    }
  }
  console.log(
    `Sermat y Volta: ${modelos.length} modelos de 12 V y ${filas.length} filas de autos (${sinMedida} solo con baterías NS o de 6 V, sin medida)`,
  );
}

async function deSermatVolta(): Promise<void> {
  const pdf = join(SALIDA, 'fuentes', 'sermat-catalogo.pdf');
  if (existsSync(pdf)) return deCatalogoSermat(pdf);
  console.log('Sermat y Volta: no está el catálogo en PDF; leyendo la lista del distribuidor…');
  const modelos = sermatVolta.leerLista(await cliente.texto(sermatVolta.URL_SERMAT_VOLTA));
  for (const m of modelos) {
    const fila = sermatVolta.aFila(m);
    if (!fila.medida) avisos.push(`${m.marca} ${m.codigo}: no se pudo deducir el amperaje de "${m.tipo}"`);
    productos.push(fila);
    compat.agregar(fragmentar(m.aplicaciones), fila.medida, sermatVolta.URL_SERMAT_VOLTA);
  }
  console.log(`Sermat y Volta: ${modelos.length} modelos`);
}

/** Edna no tiene fuente pública: se carga a mano en tools/scraper/manual/edna.csv. */
async function deEdna(): Promise<void> {
  const ruta = join(AQUI, '..', 'manual', 'edna.csv');
  const filas = parse(await readFile(ruta), { bom: true, columns: true, skip_empty_lines: true, trim: true }) as FilaProducto[];
  productos.push(...filas);
  console.log(`Edna: ${filas.length} filas de la planilla manual`);
}

async function guardarFoto(url: string, marca: string, nombre: string): Promise<string | null> {
  const archivo = `${nombre}${extname(new URL(url).pathname).toLowerCase() || '.jpg'}`;
  const relativa = `fotos/${marca}/${archivo}`;
  const destino = join(SALIDA, relativa);
  try {
    if (!existsSync(destino)) {
      await mkdir(dirname(destino), { recursive: true });
      await writeFile(destino, await cliente.binario(url));
    }
    return relativa;
  } catch (error) {
    avisos.push(`Foto ${url}: ${(error as Error).message}`);
    return null;
  }
}

const fuentes: Record<string, () => Promise<void>> = { herbo: deHerbo, 'sermat-volta': deSermatVolta, edna: deEdna };
for (const [nombre, correr] of Object.entries(fuentes)) {
  if (!solo || solo === nombre) await correr();
}

await mkdir(SALIDA, { recursive: true });
await writeFile(join(SALIDA, 'productos.csv'), aCsv(COLUMNAS_PRODUCTOS, productos));
const compatibilidades = compat.resultado();
await writeFile(join(SALIDA, 'compatibilidades.csv'), aCsv(COLUMNAS_COMPATIBILIDADES, compatibilidades));
const sinReconocer = compat.sinReconocerComoFilas();
await writeFile(join(SALIDA, 'compatibilidades-sin-reconocer.csv'), aCsv(COLUMNAS_COMPATIBILIDADES, sinReconocer));

console.log(`\nListo. En ${SALIDA}:`);
console.log(`  productos.csv: ${productos.length} productos (${productos.filter((p) => !p.medida).length} sin medida)`);
const paraRevisar = compatibilidades.filter((c) => c.revisar).length;
console.log(
  `  compatibilidades.csv: ${compatibilidades.length} autos (${paraRevisar} marcados en la columna "revisar"). Sin años = valen para todos los años.`,
);
console.log(`  compatibilidades-sin-reconocer.csv: ${sinReconocer.length} textos de las fuentes que no se pudieron leer como un auto.`);
if (avisos.length) console.log(`\nAvisos (${avisos.length}):\n${avisos.map((a) => `  - ${a}`).join('\n')}`);
