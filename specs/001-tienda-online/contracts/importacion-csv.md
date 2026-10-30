# Contrato: planillas de importación

**Ruta:** `POST /api/v1/admin/importaciones` (multipart: `tipo`, `archivo`) · Requisitos: FR-046,
FR-070. El scraper (`tools/scraper/`) genera exactamente estos formatos.

## Reglas comunes

- CSV UTF-8, separador `,`, primera fila con los encabezados exactos (en cualquier orden).
- Cada fila se valida sola; una fila con error no frena las demás (US5-01).
- Respuesta: `{ importacionId, filasTotal, filasOk, filasError, errores: [{ fila, campo,
  motivo }] }`. `fila` cuenta desde 2 (la 1 son los encabezados).
- Máximo 5.000 filas o 5 MB por archivo.

## `tipo=productos`

| Columna | Obligatoria | Regla |
| :- | :- | :- |
| `sku` | sí | Clave de upsert (US5-02) |
| `marca` | sí | Una de las marcas existentes (Sermat, Herbo, Volta, Edna) |
| `nombre` | sí | |
| `medida` | sí | Una medida existente (`12x65`…) |
| `amperaje_ah` | sí | Entero > 0 |
| `cca` | no | Entero > 0 |
| `gama` | sí | `economica` o `reforzada` |
| `descripcion` | no | |
| `precio_lista` | no | Pesos con hasta 2 decimales; vacío = sin precio (no se puede activar) |
| `stock` | no | Entero ≥ 0; vacío = 0 |
| `fotos` | no | Rutas o URLs separadas por `\|`, en orden |
| `fuente` | no | Origen del dato |

- **Producto nuevo:** se crea en `a_revisar` (FR-070).
- **Producto existente:** se actualizan los campos presentes; el estado no cambia. Una columna
  vacía no borra el valor actual, salvo `stock` explícito en 0.

## `tipo=compatibilidades`

| Columna | Obligatoria | Regla |
| :- | :- | :- |
| `marca_auto` | sí | Ej. "Volkswagen" |
| `modelo` | sí | Ej. "Gol Trend" |
| `anio_desde` | no | 1950–año actual + 1. Vacío junto con `anio_hasta` = todos los años |
| `anio_hasta` | no | ≥ `anio_desde`. Se cargan los dos o ninguno |
| `motor` | no | Ej. "1.6 nafta" |
| `medidas` | sí | Una o más medidas existentes separadas por `\|` |
| `fuente` | no | |

- Clave de upsert: `(marca_auto, modelo, anio_desde, anio_hasta, motor)`. Las medidas de la fila
  reemplazan a las anteriores de ese vehículo.
