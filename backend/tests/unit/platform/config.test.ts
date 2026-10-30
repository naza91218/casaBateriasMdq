import { describe, expect, test } from 'vitest';
import { cargarConfig } from '../../../src/platform/config.js';

const BASE = {
  DATABASE_URL: 'postgres://casa:casa@localhost:5433/casa',
  API_PUBLIC_URL: 'https://lacasadelasbaterias.com.ar',
  FRONTEND_URL: 'https://lacasadelasbaterias.com.ar',
  REVALIDATE_SECRET: 'un-secreto-de-verdad-123',
  DNI_ENCRYPTION_KEY: Buffer.alloc(32, 9).toString('base64'),
  MAIL_FROM: 'Tienda <pedidos@lacasadelasbaterias.com.ar>',
  MAIL_ADMIN: 'admin@lacasadelasbaterias.com.ar',
  RESEND_API_KEY: 're_prueba',
  MP_ACCESS_TOKEN: 'APP_USR-prueba',
  MP_WEBHOOK_SECRET: 'secreto-webhook',
};

describe('configuración de un servidor (T146)', () => {
  test('completa, arranca', () => {
    expect(cargarConfig({ ...BASE, NODE_ENV: 'production' }).esProduccion).toBe(true);
    expect(cargarConfig({ ...BASE, NODE_ENV: 'staging' }).esProduccion).toBe(false);
  });

  test('sin Mercado Pago o sin Resend no arranca: nunca la pasarela simulada en un servidor', () => {
    expect(() => cargarConfig({ ...BASE, NODE_ENV: 'production', MP_ACCESS_TOKEN: '' })).toThrow(
      'Faltan variables fuera de desarrollo: MP_ACCESS_TOKEN',
    );
    expect(() =>
      cargarConfig({ ...BASE, NODE_ENV: 'staging', RESEND_API_KEY: '', MP_WEBHOOK_SECRET: '' }),
    ).toThrow('RESEND_API_KEY, MP_WEBHOOK_SECRET');
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

  test('en desarrollo alcanza con lo mínimo', () => {
    expect(() =>
      cargarConfig({ ...BASE, NODE_ENV: 'development', MP_ACCESS_TOKEN: '', RESEND_API_KEY: '' }),
    ).not.toThrow();
  });
});
