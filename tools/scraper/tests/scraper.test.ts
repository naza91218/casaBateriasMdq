import { describe, expect, test } from 'vitest';
import { ClienteEducado } from '../src/cliente.js';
import { AcumuladorCompatibilidades, detectarAuto, fragmentar } from '../src/compatibilidad.js';
import * as herbo from '../src/fuentes/herbo.js';
import * as sermatVolta from '../src/fuentes/sermat-volta.js';
import { aCsv, voltsYAmperes } from '../src/planillas.js';
import { leerRobots, sePuede } from '../src/robots.js';

describe('robots.txt', () => {
  const reglas = leerRobots(
    ['User-agent: AhrefsBot', 'Disallow: /', '', 'User-agent: *', 'Disallow: /wp-admin/', 'Allow: /wp-admin/admin-ajax.php', 'Disallow: /*.json$', 'Crawl-delay: 3'].join('\n'),
    'CasaDeLasBaterias-Catalogo/1.0',
  );
  test.each([
    ['/producto/evolution-60/', true],
    ['/wp-admin/options.php', false],
    ['/wp-admin/admin-ajax.php', true],
    ['/datos.json', false],
    ['/datos.json?x=1', true],
  ])('%s → %s', (ruta, permitido) => {
    expect(sePuede(reglas, ruta)).toBe(permitido);
  });
  test('toma el crawl-delay de su grupo y no las reglas de otros bots', () => {
    expect(reglas.esperaSegundos).toBe(3);
    expect(reglas.prohibir).not.toContain('/');
  });
});

describe('cliente educado', () => {
  test('no pide lo que robots.txt prohíbe, se identifica y espera entre pedidos', async () => {
    const pedidos: { url: string; ua: string; en: number }[] = [];
    const fetchFalso = (async (url: string, init?: RequestInit) => {
      pedidos.push({ url, ua: new Headers(init?.headers).get('user-agent') ?? '', en: Date.now() });
      return new Response(url.endsWith('robots.txt') ? 'User-agent: *\nDisallow: /privado/' : 'ok');
    }) as typeof fetch;
    const cliente = new ClienteEducado({ esperaMs: 50, fetch: fetchFalso });

    await expect(cliente.texto('https://sitio.test/privado/x')).rejects.toThrow('robots.txt no permite');
    expect(await cliente.texto('https://sitio.test/a')).toBe('ok');
    await cliente.texto('https://sitio.test/b');

    expect(pedidos.map((p) => new URL(p.url).pathname)).toEqual(['/robots.txt', '/a', '/b']);
    expect(pedidos.every((p) => p.ua.includes('CasaDeLasBaterias'))).toBe(true);
    expect((pedidos[2]?.en ?? 0) - (pedidos[1]?.en ?? 0)).toBeGreaterThanOrEqual(45);
  });
});

describe('amperaje', () => {
  test.each([
    ['Platinum 12 80', { volts: 12, ah: 80 }],
    ['12V45AMP', { volts: 12, ah: 45 }],
    ['12-110', { volts: 12, ah: 110 }],
    ['Perkins 6-140', { volts: 6, ah: 140 }],
    ['Compact Free', null],
    ['12V 400CA', null],
  ])('%s', (texto, esperado) => {
    expect(voltsYAmperes(texto)).toEqual(esperado);
  });
});

describe('autos compatibles', () => {
  test.each([
    ['VW Gol 1.0', ['Volkswagen', 'Gol', '1.0']],
    ['VW.Gol', ['Volkswagen', 'Gol', '']],
    ['Gol trend', ['Volkswagen', 'Gol Trend', '']],
    ['F. Palio', ['Fiat', 'Palio', '']],
    ['R. Clio 1.2', ['Renault', 'Clio', '1.2']],
    ['Clio mio', ['Renault', 'Clio Mio', '']],
    ['Siena 1.7 TD', ['Fiat', 'Siena', '1.7 TD']],
    ['207', ['Peugeot', '207', '']],
    ['Classic', ['Chevrolet', 'Classic', '']],
    ['Voyager', ['Volkswagen', 'Voyage', '']],
    ['Hyundai 130', ['Hyundai', 'i30', '']],
    ['Ecosport Kinecit', ['Ford', 'EcoSport', '']],
    ['HRV', ['Honda', 'HR-V', '']],
  ])('%s', (texto, [marca, modelo, motor]) => {
    expect(detectarAuto(texto)).toMatchObject({ marca, modelo, motor });
  });

  test('lo desconocido no se inventa', () => {
    expect(detectarAuto('Autoelevadores')).toBeNull();
    expect(detectarAuto('Camiones y ómnibus')).toBeNull();
  });

  test('texto libre de aplicaciones → un fragmento por auto y la marca sale del modelo', () => {
    const fragmentos = fragmentar('P 208/308/207 Fiat Argo-Cronos - Toyota Corolla/Etios - VW Fox/UP');
    expect(fragmentos).toEqual(['P 208', '308', '207', 'Fiat Argo', 'Cronos', 'Toyota Corolla', 'Etios', 'VW Fox', 'UP']);
    expect(fragmentos.map((f) => detectarAuto(f)?.marca)).toEqual([
      'Peugeot',
      'Peugeot',
      'Peugeot',
      'Fiat',
      'Fiat',
      'Toyota',
      'Toyota',
      'Volkswagen',
      'Volkswagen',
    ]);
  });

  test('rangos de años y marcas sin separador', () => {
    expect(fragmentar('Blazer-C10-BMW serie 3-Ranger 2012/16')).toEqual(['Blazer', 'C10', 'BMW serie 3', 'Ranger 2012~16']);
    expect(fragmentar('Clio mio-palio 8v-Ford ka y Ecosport 1ra gen.')).toEqual(['Clio mio', 'palio 8v', 'Ford ka', 'Ecosport 1ra gen.']);
  });

  test('un auto con varias medidas queda en una fila; lo no reconocido va aparte sin marca', () => {
    const a = new AcumuladorCompatibilidades();
    a.agregar(['VW Gol 1.0', 'Autoelevadores'], '12x65', 'https://www.herbobaterias.com/producto/compact/');
    a.agregar(['VW.Gol 1.0'], '12x45', 'https://www.bateriaspeiro.com.ar/sermat.html');
    expect(a.resultado()).toEqual([
      expect.objectContaining({
        marca_auto: 'Volkswagen',
        modelo: 'Gol',
        motor: '1.0',
        medidas: '12x45|12x65',
        anio_desde: '',
        fuente: 'herbobaterias.com | bateriaspeiro.com.ar',
      }),
    ]);
    expect(a.sinReconocerComoFilas()).toEqual([expect.objectContaining({ marca_auto: '', modelo: 'Autoelevadores', medidas: '12x65' })]);
  });
});

const FICHA_HERBO = `<html><head>
<meta property="og:title" content="Platinum 12 80 - Herbo Baterías" />
<meta property="og:description" content="Dimensiones:277 X 175 X 176 mm &gt; Línea 12 volts12V 600CA 90min RC" />
<meta property="og:image" content="https://www.herbobaterias.com/wp-content/uploads/2016/09/platinum.png" />
</head><body><div class="summary">
<span class="posted_in">Categorías: <a rel="tag">308</a>, <a rel="tag">Focus 1.8</a>, <a rel="tag">Ranger</a></span>
<span class="tagged_as">Etiquetas: <a rel="tag">Autos</a>, <a rel="tag">Ranger</a></span>
</div></body></html>`;

describe('fuente Herbo', () => {
  const ficha = herbo.leerFicha(FICHA_HERBO, 'https://www.herbobaterias.com/producto/platinum/');

  test('lee nombre, datos eléctricos, medidas, foto, autos y etiquetas', () => {
    expect(ficha).toMatchObject({
      slug: 'platinum',
      nombre: 'Platinum 12 80',
      linea: '12 volts',
      volts: 12,
      cca: 600,
      reservaMin: 90,
      dimensiones: '277 x 175 x 176 mm',
      foto: 'https://www.herbobaterias.com/wp-content/uploads/2016/09/platinum.png',
      autos: ['308', 'Focus 1.8', 'Ranger'],
      etiquetas: ['Autos', 'Ranger'],
    });
    expect(herbo.esDelRubro(ficha)).toBe(true);
  });

  test('arma la fila de importación sin precio y con la foto descargada', () => {
    expect(herbo.aFila(ficha, 'fotos/herbo/platinum.png')).toEqual({
      sku: 'HERBO-PLATINUM',
      marca: 'Herbo',
      nombre: 'Herbo Platinum 12 80',
      medida: '12x80',
      amperaje_ah: '80',
      cca: '600',
      gama: 'reforzada',
      descripcion: 'Línea 12 volts. 600 A de arranque en frío (CCA). Reserva de 90 minutos. Medidas: 277 x 175 x 176 mm.',
      precio_lista: '',
      stock: '',
      fotos: 'fotos/herbo/platinum.png',
      fuente: 'https://www.herbobaterias.com/producto/platinum/',
    });
  });

  test('sin amperaje en el nombre lo toma del código de la URL', () => {
    const compact = { ...ficha, nombre: 'Compact Free', slug: 'evolution-60' };
    expect(herbo.amperajeDe(compact)).toBe(60);
  });

  test('descarta motos y lo que no es de 12 V', () => {
    expect(herbo.esDelRubro({ ...ficha, etiquetas: ['Motos'] })).toBe(false);
    expect(herbo.esDelRubro({ ...ficha, volts: 6 })).toBe(false);
  });
});

const LISTA_DISTRIBUIDOR = `<html><body>
<h2>BATERÍAS SERMAT</h2><h3>Línea Principal</h3>
<table><tr><th>Código de Batería</th><th>Tipo</th><th>Aplicaciones</th><th>Precio de Lista</th></tr>
<tr><td>12-45</td><td>12V45AMP</td><td>Clio mio-palio 8v-Ford ka</td><td>$94.381</td></tr></table>
<h3>Línea Pesada</h3>
<table><tr><th>Código de Batería</th><th>Tipo</th><th>Aplicaciones</th><th>Precio de Lista</th></tr>
<tr><td>12-90A</td><td>12V90AMP ALTA</td><td>Toyota Hilux</td><td>$174.263</td></tr></table>
<h2>BATERÍAS VOLTA</h2><h3>Línea Volta</h3>
<table><tr><th>Código de Batería</th><th>Tipo</th><th>Aplicaciones</th><th>Precio de Lista</th></tr>
<tr><td>VT-180</td><td>180AMP</td><td>Camiones</td><td>$246.873</td></tr></table>
</body></html>`;

describe('fuente Sermat y Volta', () => {
  const modelos = sermatVolta.leerLista(LISTA_DISTRIBUIDOR);

  test('separa marcas y líneas por los títulos', () => {
    expect(modelos.map((m) => [m.marca, m.linea, m.codigo])).toEqual([
      ['Sermat', 'Principal', '12-45'],
      ['Sermat', 'Pesada', '12-90A'],
      ['Volta', 'Volta', 'VT-180'],
    ]);
  });

  test('nunca copia el precio de lista', () => {
    const filas = modelos.map(sermatVolta.aFila);
    expect(filas.every((f) => f.precio_lista === '')).toBe(true);
    expect(JSON.stringify(filas)).not.toContain('94');
  });

  test('deduce medida, borne y gama', () => {
    expect(sermatVolta.aFila(modelos[1] as sermatVolta.ModeloLista)).toMatchObject({
      sku: 'SERMAT-12-90A',
      medida: '12x90',
      gama: 'reforzada',
      descripcion: 'Línea Pesada. 12 V 90 Ah. Borne alto.',
    });
    expect(sermatVolta.aFila(modelos[2] as sermatVolta.ModeloLista)).toMatchObject({ sku: 'VOLTA-VT-180', medida: '12x180' });
  });
});

describe('CSV', () => {
  test('comillas solo donde hace falta, BOM y fin de línea de Windows', () => {
    const csv = aCsv<{ a: string; b: string }>(['a', 'b'], [{ a: 'Gol, Fox', b: 'dice "hola"' }]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.slice(1)).toBe('a,b\r\n"Gol, Fox","dice ""hola"""\r\n');
  });
});
