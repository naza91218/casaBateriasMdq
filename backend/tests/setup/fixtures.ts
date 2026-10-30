import { eq } from 'drizzle-orm';
import type { BaseDeDatos } from '../../src/platform/db.js';
import { marcas, productos } from '../../src/modules/catalogo/infrastructure/schema.js';
import { vehiculoMedidas, vehiculos } from '../../src/modules/compatibilidad/infrastructure/schema.js';
import { slug } from '../../src/shared-kernel/slug.js';

let contador = 0;

export async function idMarca(db: BaseDeDatos, nombre: string): Promise<string> {
  const [m] = await db.select({ id: marcas.id }).from(marcas).where(eq(marcas.nombre, nombre));
  if (!m) throw new Error(`No existe la marca ${nombre}: corré sembrarCatalogo`);
  return m.id;
}

export async function crearProducto(
  db: BaseDeDatos,
  datos: {
    marca: string;
    medida: string;
    gama: 'economica' | 'reforzada';
    precio?: number; // en pesos
    stock?: number;
    estado?: 'a_revisar' | 'activo' | 'pausado' | 'archivado';
    nombre?: string;
  },
) {
  contador++;
  const nombre = datos.nombre ?? `${datos.marca} ${datos.medida} ${datos.gama} ${contador}`;
  const [p] = await db
    .insert(productos)
    .values({
      sku: `SKU-${contador}-${Date.now()}`,
      slug: slug(nombre),
      nombre,
      marcaId: await idMarca(db, datos.marca),
      medida: datos.medida,
      amperajeAh: Number(datos.medida.split('x')[1] ?? 65),
      cca: 400,
      gama: datos.gama,
      precioLista: BigInt(Math.round((datos.precio ?? 100_000) * 100)),
      stock: datos.stock ?? 5,
      estado: datos.estado ?? 'activo',
      fuente: 'test',
    })
    .returning();
  if (!p) throw new Error('No se creó el producto');
  return p;
}

export async function crearVehiculo(
  db: BaseDeDatos,
  datos: { marca: string; modelo: string; desde?: number | null; hasta?: number | null; medidas: string[] },
) {
  const [v] = await db
    .insert(vehiculos)
    .values({
      marca: datos.marca,
      marcaSlug: slug(datos.marca),
      modelo: datos.modelo,
      modeloSlug: slug(datos.modelo),
      anioDesde: datos.desde ?? null,
      anioHasta: datos.hasta ?? null,
      fuente: 'test',
    })
    .returning();
  if (!v) throw new Error('No se creó el vehículo');
  if (datos.medidas.length) {
    await db.insert(vehiculoMedidas).values(datos.medidas.map((medida) => ({ vehiculoId: v.id, medida })));
  }
  return v;
}

export async function vaciarCatalogo(db: BaseDeDatos): Promise<void> {
  await db.delete(vehiculoMedidas);
  await db.delete(vehiculos);
  await db.delete(productos);
}

/** Una foto JPG de prueba, con EXIF (para comprobar que se borra al subirla). */
export async function fotoDePrueba(ancho = 800, alto = 600): Promise<Buffer> {
  const { default: sharp } = await import('sharp');
  return sharp({ create: { width: ancho, height: alto, channels: 3, background: { r: 200, g: 30, b: 30 } } })
    .jpeg()
    .withExif({ IFD0: { Copyright: 'Prueba', Artist: 'Celular de Juan' } })
    .toBuffer();
}
