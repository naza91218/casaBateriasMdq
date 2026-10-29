/** Puerto de tiempo: permite probar vencimientos (30 min, 48 h) sin esperar. */
export interface Reloj {
  ahora(): Date;
}

export const relojDelSistema: Reloj = {
  ahora: () => new Date(),
};

export class RelojFalso implements Reloj {
  private actual: Date;

  constructor(inicio: Date = new Date('2026-11-01T12:00:00Z')) {
    this.actual = new Date(inicio);
  }

  ahora(): Date {
    return new Date(this.actual);
  }

  avanzar(ms: number): void {
    this.actual = new Date(this.actual.getTime() + ms);
  }

  fijar(fecha: Date): void {
    this.actual = new Date(fecha);
  }
}

export const MINUTO = 60_000;
export const HORA = 60 * MINUTO;
export const DIA = 24 * HORA;
