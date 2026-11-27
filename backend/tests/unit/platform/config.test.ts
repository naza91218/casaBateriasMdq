import { describe, expect, test } from 'vitest';
import { cargarConfig } from '../../../src/platform/config.js';

const BASE = {
  DATABASE_URL: 'postgres://casa:casa@localhost:5433/casa',
  API_PUBLIC_URL: 'https://casadelasbaterias.com.ar',
  FRONTEND_URL: 'https://casadelasbaterias.com.ar',
  REVALIDATE_SECRET: 'un-secreto-de-verdad-123',
  DNI_ENCRYPTION_KEY: Buffer.alloc(32, 9).toString('base64'),
  MAIL_FROM: 'Tienda <pedidos@casadelasbaterias.com.ar>',
  MAIL_ADMIN: 'admin@casadelasbaterias.com.ar',
  RESEND_API_KEY: 're_prueba',
  MP_ACCESS_TOKEN: 'APP_USR-prueba',
  MP_WEBHOOK_SECRET: 'secreto-webhook',
};

describe('configuración de un servidor (T146)', () => {
  test('completa, arranca', () => {
    expect(cargarConfig({ ...BASE, NODE_ENV: 'production' }).esProduccion).toBe(true);
    expect(cargarConfig({ ...BASE, NODE_ENV: 'staging' }).esProduccion).toBe(false);
  });

  test('Mercado Pago va completo o no va; sin Resend no arranca', () => {
    expect(() => cargarConfig({ ...BASE, NODE_ENV: 'production', MP_ACCESS_TOKEN: '' })).toThrow(
      'Faltan variables fuera de desarrollo: MP_ACCESS_TOKEN',
    );
    expect(() =>
      cargarConfig({ ...BASE, NODE_ENV: 'production', RESEND_API_KEY: '', MP_WEBHOOK_SECRET: '' }),
    ).toThrow('RESEND_API_KEY, MP_WEBHOOK_SECRET');
    expect(cargarConfig({ ...BASE, NODE_ENV: 'production' }).mercadoPagoActivo).toBe(true);
  });

  test('producción sin credenciales de Mercado Pago arranca con ese medio apagado (D28)', () => {
    const sinMp = { ...BASE, NODE_ENV: 'production', MP_ACCESS_TOKEN: '', MP_WEBHOOK_SECRET: '' };
    expect(cargarConfig(sinMp).mercadoPagoActivo).toBe(false);
    expect(cargarConfig({ ...sinMp, NODE_ENV: 'staging' }).mercadoPagoActivo).toBe(true);
  });

  test('staging arranca sin Mercado Pago, pero no sin Resend', () => {
    const sinMp = { ...BASE, NODE_ENV: 'staging', MP_ACCESS_TOKEN: '', MP_WEBHOOK_SECRET: '' };
    expect(() => cargarConfig(sinMp)).not.toThrow();
    expect(() => cargarConfig({ ...sinMp, RESEND_API_KEY: '' })).toThrow(
      'Faltan variables fuera de desarrollo: RESEND_API_KEY',
    );
  });

  test('con la clave de ejemplo del DNI o del frontend no arranca', () => {
    expect(() =>
      cargarConfig({
        ...BASE,
        NODE_ENV: 'production',
        DNI_ENCRYPTION_KEY: 'MDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA=',
        REVALIDATE_SECRET: 'cambiar-por-un-secreto-largo',
      }),
    ).toThrow('Estas variables tienen el valor de ejemplo: DNI_ENCRYPTION_KEY, REVALIDATE_SECRET');
  });

  test('el ingreso directo de la demo nunca arranca en un servidor', () => {
    expect(() =>
      cargarConfig({ ...BASE, NODE_ENV: 'staging', DEMO_INGRESO_DIRECTO: 'admin@demo.test' }),
    ).toThrow('DEMO_INGRESO_DIRECTO es solo para la demo');
  });

  test('en desarrollo alcanza con lo mínimo', () => {
    expect(() =>
      cargarConfig({ ...BASE, NODE_ENV: 'development', MP_ACCESS_TOKEN: '', RESEND_API_KEY: '' }),
    ).not.toThrow();
  });
});
