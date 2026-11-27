import { randomBytes } from 'node:crypto';
import { describe, expect, test } from 'vitest';
import { crearCifrador, hashToken, tokenAleatorio } from '../../../src/platform/crypto.js';

const clave1 = randomBytes(32);
const clave2 = randomBytes(32);

describe('cifrado AES-256-GCM del DNI', () => {
  test('ida y vuelta con la versión actual', () => {
    const cifrador = crearCifrador({ claves: { 1: clave1 }, versionActual: 1 });
    const { datos, version } = cifrador.cifrar('30123456');
    expect(version).toBe(1);
    expect(datos.toString('utf8')).not.toContain('30123456');
    expect(cifrador.descifrar(datos, version)).toBe('30123456');
  });

  test('usa un IV distinto en cada llamada', () => {
    const cifrador = crearCifrador({ claves: { 1: clave1 }, versionActual: 1 });
    const a = cifrador.cifrar('30123456').datos;
    const b = cifrador.cifrar('30123456').datos;
    expect(a.equals(b)).toBe(false);
  });

  test('falla si el dato fue alterado', () => {
    const cifrador = crearCifrador({ claves: { 1: clave1 }, versionActual: 1 });
    const { datos } = cifrador.cifrar('30123456');
    datos[datos.length - 1] = (datos[datos.length - 1] ?? 0) ^ 0xff;
    expect(() => cifrador.descifrar(datos, 1)).toThrow();
  });

  test('descifra datos de una versión de clave anterior después de rotar', () => {
    const viejo = crearCifrador({ claves: { 1: clave1 }, versionActual: 1 });
    const { datos } = viejo.cifrar('30123456');
    const nuevo = crearCifrador({ claves: { 1: clave1, 2: clave2 }, versionActual: 2 });
    expect(nuevo.descifrar(datos, 1)).toBe('30123456');
    expect(nuevo.cifrar('1').version).toBe(2);
  });

  test('rechaza claves que no son de 32 bytes', () => {
    expect(() => crearCifrador({ claves: { 1: randomBytes(16) }, versionActual: 1 })).toThrow();
  });
});

describe('tokens', () => {
  test('tokenAleatorio es largo, url-safe y distinto cada vez', () => {
    const a = tokenAleatorio();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(tokenAleatorio()).not.toBe(a);
  });

  test('hashToken es SHA-256 hex y determinístico', () => {
    expect(hashToken('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });
});
