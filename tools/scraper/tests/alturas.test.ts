import { describe, expect, test } from 'vitest';
import { soloDisponibles } from '../src/disponibles.js';
import { medida, type FilaCompatibilidad, type FilaProducto } from '../src/planillas.js';
import { rehacerMedidaProducto, rehacerMedidasAuto } from '../src/rehacer.js';

const producto = (p: Partial<FilaProducto>): FilaProducto => ({
  sku: 'X',
  marca: 'Sermat',
  nombre: 'X',
  medida: '12x90',
  amperaje_ah: '90',
  cca: '',
  gama: 'reforzada',
  descripcion: '',
  precio_lista: '',
  stock: '',
  fotos: '',
  fuente: 'pdf',
  ...p,
});

const auto = (medidas: string, texto_original: string): FilaCompatibilidad => ({
  marca_auto: 'BMW',
  modelo: '520',
  anio_desde: '',
  anio_hasta: '',
  motor: '',
  medidas,
  fuente: 'pdf',
  texto_original,
  revisar: '',
});

describe('12x90 y 12x110 en caja alta o baja', () => {
  test('desde 200 mm de alto es alta; las demás medidas no cambian', () => {
    expect(medida(12, 90, 227)).toBe('12x90 alta');
    expect(medida(12, 110, 194)).toBe('12x110 baja');
    expect(medida(12, 95, 190)).toBe('12x95 baja');
    expect(medida(12, 100, 230)).toBe('12x100 alta');
    expect(medida(12, 75, 204)).toBe('12x75');
    expect(medida(12, 75, 230)).toBe('12x75');
    expect(medida(12, 90)).toBe('12x90');
  });

  test('producto: por el alto de la descripción o por la letra del código', () => {
    expect(
      rehacerMedidaProducto(producto({ descripcion: 'Medidas: 277 x 175 x 190 mm.' })).medida,
    ).toBe('12x90 baja');
    expect(
      rehacerMedidaProducto(producto({ sku: 'SERMAT-12-110-C', medida: '12x110' })).medida,
    ).toBe('12x110 alta');
  });

  test('auto: la letra del código de Sermat; sin código (Herbo), alta', () => {
    expect(rehacerMedidasAuto(auto('12x80|12x90', '18 → 12-80 BD / 12-90 BD')).medidas).toBe(
      '12x80|12x90 baja',
    );
    expect(rehacerMedidasAuto(auto('12x110', 'Daily')).medidas).toBe('12x110 alta');
    expect(rehacerMedidasAuto(auto('12x65', '145 → 12-65 D')).medidas).toBe('12x65');
  });
});

test('a la planilla pasa solo lo que tiene el local, con los que no trae ninguna fuente', () => {
  const { filas } = soloDisponibles([
    producto({ sku: 'SERMAT-12-45', medida: '12x45' }),
    producto({ sku: 'SERMAT-12-70', medida: '12x70' }),
    producto({ sku: 'SERMAT-S1600C29', medida: '' }),
  ]);
  const skus = filas.map((f) => f.sku);
  expect(skus).toContain('SERMAT-12-45');
  expect(skus).not.toContain('SERMAT-12-70');
  expect(skus).toContain('VOLTA-65');
  expect(filas.find((f) => f.sku === 'SERMAT-S1600C29')?.medida).toBe('12x160');
});
