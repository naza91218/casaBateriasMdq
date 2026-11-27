# Scraper de la carga inicial del catálogo

Arma las planillas de importación con los datos técnicos, los autos compatibles y las fotos de las
marcas. **Nunca escribe en la base**: las planillas se importan desde el panel, donde todo entra
"a revisar" y el administrador habilita lo que vende (FR-070). Los precios y el stock los pone el
negocio; el scraper no los copia.

## Cómo se usa

```bash
pnpm --filter @casa/scraper scrape                       # todas las fuentes
pnpm --filter @casa/scraper scrape -- --solo herbo        # una sola: herbo | sermat-volta | edna
pnpm --filter @casa/scraper scrape -- --sin-fotos         # sin bajar fotos
```

Deja en `data/import/` (fuera del repositorio):

| Archivo | Qué es |
| :- | :- |
| `productos.csv` | Baterías de las cuatro marcas, con el formato de importación |
| `compatibilidades.csv` | Qué medidas lleva cada auto. Sin años = vale para todos sus años |
| `compatibilidades-sin-reconocer.csv` | Textos de las fuentes que no se pudieron leer como un auto |
| `fotos/<marca>/` | Fotos de las marcas, referenciadas desde `productos.csv` |

## Fuentes

| Marca | Fuente | Qué aporta |
| :- | :- | :- |
| Sermat y Volta | Catálogo oficial en PDF que pasó el cliente, en `data/import/fuentes/sermat-catalogo.pdf` | Ficha técnica de cada modelo y batería estándar y opcional de cada auto |
| Sermat y Volta | Si no está el PDF: lista pública de un distribuidor | Modelos y aplicaciones en texto libre |
| Herbo | herbobaterias.com (respeta su `robots.txt`, un pedido cada 2 s) | Datos eléctricos, medidas, foto y autos compatibles |
| Edna | `manual/edna.csv`, a mano | No tiene catálogo público |

## Qué revisar antes de importar

1. **Productos sin medida.** El catálogo de Sermat no dice el amperaje de las NS40, NS60 y las de
   camión (S1250C23 y similares). Completá `medida` y `amperaje_ah` o borrá la fila.
2. **Gama.** Es una suposición inicial (Volta y las líneas básicas como económicas; Sermat y las
   premium como reforzadas). Corregila según cómo las vende el negocio.
3. **Columna `revisar` de `compatibilidades.csv`.** Marca las filas con letras mal codificadas en
   el PDF ("AYEO" es AVEO, "(3" es C3), notas al pie (`*`) o menciones de años.
4. **Años.** Las fuentes casi no los traen. Sin años, el auto vale para todos los años y el
   buscador no pregunta el año. Si un modelo cambió de batería según el año, cargá los años.
5. **Borne y polaridad.** El buscador compara por medida. El código del fabricante ("12-75 BD":
   borne bajo, polo derecho) queda en `texto_original` para consultarlo al colocar la batería.
6. **Fotos de las marcas.** Son provisorias: conviene confirmar con el distribuidor que se pueden
   usar y reemplazarlas por fotos propias.

Las columnas `texto_original` y `revisar` son solo para la revisión: la importación las ignora.
