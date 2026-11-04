import { describe, expect, test } from 'vitest';
import {
  aFilaProducto,
  amperajeDeModelo,
  autosDeFila,
  leerCompatibilidades,
  leerModelos,
  limpiar,
  medidaDeCodigo,
  normalizarCodigo,
  textoDudoso,
  type TextoPdf,
} from '../src/fuentes/sermat-pdf.js';

const TITULO = 'fuente_titulo';
const NORMAL = 'fuente_texto';
const t = (x: number, y: number, texto: string, fuente = NORMAL): TextoPdf => ({
  x,
  y,
  texto: limpiar(texto),
  fuente,
});

/** Una página de compatibilidad con la misma grilla que el catálogo (modelo, estándar, opcional). */
const PAGINA_AUTOS: TextoPdf[] = [
  t(103, 762, 'HOLDICH 43'),
  t(168, 586, 'MARCA / MODELO'),
  t(430, 586, 'ESTANDAR'),
  t(502, 586, 'OPCIONAL'),
  t(168, 564, 'Chevrolet', TITULO),
  t(168, 546, 'AGILE /CELTA / CLASSIC / ONIX / PRISMA'),
  t(437, 546, '12\u001f65 D'),
  t(509, 546, '12\u001f70 D'),
  t(168, 525, 'SPARK* / COBALT**'),
  t(437, 525, 'NS\u001f40*'),
  t(508, 524, '12\u001f55**'),
  t(168, 504, 'D20 / SILVERADO / S10 >2016'),
  t(434, 504, '12\u001f90 BD'),
  t(505, 504, '12\u001f110 BD'),
  t(168, 480, 'Tractores', TITULO),
  t(168, 460, 'JOHN DEERE 445'),
  t(437, 460, '12-110 AL'),
  t(168, 440, 'Fiat', TITULO),
  t(168, 420, 'TEMPRA / SPAZIO / DOBLO NAFTA'),
  t(437, 420, '12-651'),
  t(509, 420, '12-701'),
  t(168, 400, '600, 800 COUPE'),
  t(437, 400, '12- 75 BD'),
  t(522, 400, '\u001f'),
];

describe('catálogo de Sermat: autos', () => {
  const filas = leerCompatibilidades([PAGINA_AUTOS]);

  test('arma filas por renglón con la marca del título y saltea secciones fuera del rubro', () => {
    expect(filas).toEqual([
      {
        marca: 'Chevrolet',
        modelos: 'AGILE /CELTA / CLASSIC / ONIX / PRISMA',
        estandar: '12-65 D',
        opcional: '12-70 D',
      },
      { marca: 'Chevrolet', modelos: 'SPARK* / COBALT**', estandar: 'NS-40', opcional: '12-55' },
      {
        marca: 'Chevrolet',
        modelos: 'D20 / SILVERADO / S10 >2016',
        estandar: '12-90 BD',
        opcional: '12-110 BD',
      },
      {
        marca: 'Fiat',
        modelos: 'TEMPRA / SPAZIO / DOBLO NAFTA',
        estandar: '12-65 I',
        opcional: '12-70 I',
      },
      { marca: 'Fiat', modelos: '600, 800 COUPE', estandar: '12-75 BD', opcional: null },
    ]);
  });

  test('códigos → medida comercial; las NS y las de 6 V no tienen', () => {
    expect(
      ['12-65 D', '12-110 BD', '12-75 AL', '12-90 AD', '12-110 C', 'NS-40', '6-160'].map(
        medidaDeCodigo,
      ),
    ).toEqual(['12x65', '12x110 baja', '12x75', '12x90 alta', '12x110 alta', null, null]);
    expect(normalizarCodigo('12/75 AD')).toBe('12-75 AD');
    expect(normalizarCodigo('12-1101')).toBe('12-110 I');
    expect(normalizarCodigo('-')).toBeNull();
  });

  test('un auto por fragmento, con motor y combustible aparte y sin años en el nombre', () => {
    expect(autosDeFila('TEMPRA / SPAZIO / DOBLO NAFTA').map((a) => [a.modelo, a.motor])).toEqual([
      ['Tempra', ''],
      ['Spazio', ''],
      ['Doblo', 'NAFTA'],
    ]);
    expect(autosDeFila('D20 / SILVERADO / S10 >2016').map((a) => a.modelo)).toEqual([
      'D20',
      'Silverado',
      'S10',
    ]);
    expect(autosDeFila('600, 800 COUPE').map((a) => a.modelo)).toEqual(['600', '800 Coupe']);
    expect(autosDeFila('CAMIONES: FH 12380/ NH 12420').map((a) => a.modelo)).toEqual([
      'FH 12380',
      'NH 12420',
    ]);
    expect(autosDeFila('33 / V6 3.0').map((a) => a.modelo)).toEqual(['33']);
    expect(autosDeFila(limpiar('LUV D./ CR\u001fV')).map((a) => a.modelo)).toEqual([
      'LUV D',
      'CR-V',
    ]);
  });

  test('marca las letras mal codificadas del PDF para que Juan las revise', () => {
    expect(textoDudoso('AYEO/ ASTRA /CORSA')).toBe(true);
    expect(textoDudoso('CL / (3 / (4')).toBe(true);
    expect(textoDudoso('S0NIC')).toBe(true);
    expect(textoDudoso('AGILE /CELTA / CLASSIC')).toBe(false);
  });
});

const PAGINA_MODELOS: TextoPdf[] = [
  t(140, 686, 'MODELO'),
  t(243, 686, 'VOLT.'),
  t(296, 686, 'LARGO'),
  t(352, 686, 'ANCHO'),
  t(410, 686, 'ALTO'),
  t(462, 686, 'PLACAS'),
  t(523, 686, 'PESO'),
  ...[
    [662, 'NS40', '11,6', '192', '122', '202', '9', '11,6'],
    [560, '12/75 B', '15,7', '264', '175', '178', '13', '15,7'],
    [203, '6/160', '18,8', '260', '172', '222', '21', '18,8'],
    [169, 'VOLTA 50', '12,6', '241', '175', '178', '9', '12,6'],
  ].flatMap(([y, ...c]) => {
    const fila = y as number;
    const [modelo, volt, largo, ancho, alto, placas, peso] = c as string[];
    return [
      t(140, fila, modelo ?? ''),
      t(246, fila, volt ?? ''),
      t(304, fila, largo ?? ''),
      t(360, fila, ancho ?? ''),
      t(416, fila, alto ?? ''),
      t(474, fila, placas ?? ''),
      // El peso a veces está un punto más abajo que el resto del renglón.
      t(527, fila - 1, peso ?? ''),
    ];
  }),
];

describe('catálogo de Sermat: fichas técnicas', () => {
  const modelos = leerModelos([PAGINA_AUTOS, PAGINA_MODELOS]);

  test('lee cada modelo con sus medidas, placas y peso', () => {
    expect(modelos.map((m) => m.codigo)).toEqual(['NS40', '12/75 B', '6/160', 'VOLTA 50']);
    expect(modelos[1]).toEqual({
      codigo: '12/75 B',
      largo: 264,
      ancho: 175,
      alto: 178,
      placas: 13,
      pesoKg: 15.7,
    });
  });

  test('arma la fila de producto: Volta como segunda marca, sin inventar amperajes', () => {
    expect(amperajeDeModelo('NS40')).toBeNull();
    expect(amperajeDeModelo('S1250C23')).toBeNull();
    const [ns, b75, , volta] = modelos.map((m) => aFilaProducto(m, 'pdf'));
    expect(ns).toMatchObject({ sku: 'SERMAT-NS40', medida: '', amperaje_ah: '' });
    expect(b75).toMatchObject({
      sku: 'SERMAT-12-75-B',
      nombre: 'Sermat 12/75 B',
      medida: '12x75',
      descripcion: 'Medidas: 264 x 175 x 178 mm. 13 placas. Peso: 15,7 kg. Borne bajo.',
      precio_lista: '',
    });
    expect(volta).toMatchObject({
      sku: 'VOLTA-50',
      marca: 'Volta',
      nombre: 'Volta 50',
      medida: '12x50',
      gama: 'economica',
    });
  });
});
