/**
 * Importe en centavos enteros (constitución V). Nunca negativo, nunca con decimales flotantes.
 */
export class Dinero {
  private constructor(readonly centavos: bigint) {
    if (centavos < 0n) throw new RangeError('Un importe no puede ser negativo');
  }

  static cero(): Dinero {
    return new Dinero(0n);
  }

  static deCentavos(centavos: bigint | number): Dinero {
    if (typeof centavos === 'number' && !Number.isSafeInteger(centavos)) {
      throw new RangeError('Los centavos tienen que ser un entero');
    }
    return new Dinero(BigInt(centavos));
  }

  /** Acepta "1234.5", "1234,50" o 1234.5. Más de dos decimales es un error. */
  static dePesos(pesos: string | number): Dinero {
    const texto = (typeof pesos === 'number' ? pesos.toFixed(2) : pesos.trim()).replace(',', '.');
    const coincide = /^(\d+)(?:\.(\d{1,2}))?$/.exec(texto);
    if (!coincide) throw new RangeError(`Importe inválido: ${pesos}`);
    const enteros = BigInt(coincide[1] ?? '0');
    const decimales = BigInt((coincide[2] ?? '').padEnd(2, '0'));
    return new Dinero(enteros * 100n + decimales);
  }

  sumar(otro: Dinero): Dinero {
    return new Dinero(this.centavos + otro.centavos);
  }

  restar(otro: Dinero): Dinero {
    return new Dinero(this.centavos - otro.centavos);
  }

  por(cantidad: number): Dinero {
    if (!Number.isInteger(cantidad) || cantidad < 0) throw new RangeError('Cantidad inválida');
    return new Dinero(this.centavos * BigInt(cantidad));
  }

  /** Porcentaje con hasta dos decimales (ej. 12.5), redondeado al centavo, mitad hacia arriba. */
  porcentaje(pct: number): Dinero {
    const puntosBase = BigInt(Math.round(pct * 100));
    if (puntosBase < 0n) throw new RangeError('Porcentaje inválido');
    return new Dinero((this.centavos * puntosBase + 5_000n) / 10_000n);
  }

  igual(otro: Dinero): boolean {
    return this.centavos === otro.centavos;
  }

  mayorQue(otro: Dinero): boolean {
    return this.centavos > otro.centavos;
  }

  esCero(): boolean {
    return this.centavos === 0n;
  }

  /** Para JSON: los importes viajan como enteros en centavos. */
  aNumero(): number {
    return Number(this.centavos);
  }
}
