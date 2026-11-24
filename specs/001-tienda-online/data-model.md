# Data Model: Tienda online de La Casa de las Baterías

**Feature**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md) · **Fecha**: 2026-10-29

PostgreSQL 17. Convenciones:

- Claves `uuid` (v7, ordenables). Fechas `timestamptz` en UTC.
- Importes en **centavos enteros** (`bigint`, value object `Dinero`).
- Cada tabla pertenece a un módulo. Otro módulo la lee o escribe **solo a través del servicio**
  de ese módulo; las claves foráneas entre módulos existen para integridad, no como permiso.

## Catálogo (`catalogo`)

### `marcas`
| Campo | Tipo | Reglas |
| :- | :- | :- |
| id | uuid PK | |
| nombre | text | UNIQUE. Inicial: Sermat, Herbo, Volta, Edna (FR-002) |
| slug | text | UNIQUE |
| activa | boolean | default true |

### `medidas`
| Campo | Tipo | Reglas |
| :- | :- | :- |
| codigo | text PK | Formato `12x65`; iniciales 12x65, 12x75, 12x90, 12x110, 12x160 (FR-003) |
| orden | int | Para listar de menor a mayor |

### `productos`
| Campo | Tipo | Reglas |
| :- | :- | :- |
| id | uuid PK | |
| sku | text | UNIQUE (FR-001, upsert de importación) |
| slug | text | UNIQUE, estable (FR-053) |
| nombre | text | Ej. "Sermat 12x65 Reforzada" |
| marca_id | uuid FK → marcas | |
| medida | text FK → medidas | |
| amperaje_ah | int | > 0 |
| cca | int | null permitido hasta revisar |
| gama | enum `economica`, `reforzada` | |
| descripcion | text | |
| precio_lista | bigint | centavos, > 0 para estar `activo` |
| stock | int | `CHECK (stock >= 0)` (FR-020, SC-003) |
| estado | enum `a_revisar`, `activo`, `pausado`, `archivado` | default `a_revisar` (FR-070) |
| fuente | text | Origen de los datos (`herbobaterias.com`, `manual`…) |
| creado_en / actualizado_en | timestamptz | |

Reglas:

- Visible en la tienda solo si `estado = activo`. Comprable solo si además `stock > 0`.
- Pasar a `activo` exige `precio_lista > 0` y al menos una foto (FR-001).
- **Eliminar (FR-071):** si no existe en `pedido_items` → `DELETE` (con sus fotos); si existe →
  `estado = archivado`.
- Índices: `(estado, medida)`, `(estado, marca_id, gama)`.

### `producto_fotos`
| Campo | Tipo | Reglas |
| :- | :- | :- |
| id | uuid PK | |
| producto_id | uuid FK → productos ON DELETE CASCADE | |
| clave | text | Clave en el almacenamiento (R2) |
| orden | int | UNIQUE `(producto_id, orden)` diferible |
| origen | enum `marca`, `propia` | Fotos de marca son provisorias |

## Compatibilidad (`compatibilidad`)

### `vehiculos`
| Campo | Tipo | Reglas |
| :- | :- | :- |
| id | uuid PK | |
| marca | text | Ej. "Volkswagen" |
| marca_slug | text | |
| modelo | text | Ej. "Gol Trend" |
| modelo_slug | text | |
| anio_desde | smallint null | null = todos los años (clarify 2026-10-30) |
| anio_hasta | smallint null | `CHECK` los dos null o los dos cargados con `anio_hasta >= anio_desde` |
| motor | text | null = cualquier motor |
| fuente | text | |

UNIQUE `(marca_slug, modelo_slug, coalesce(anio_desde, 0), coalesce(anio_hasta, 0), coalesce(motor, ''))`.

### `vehiculo_medidas`
| Campo | Tipo | Reglas |
| :- | :- | :- |
| vehiculo_id | uuid FK → vehiculos ON DELETE CASCADE | PK compuesta |
| medida | text FK → medidas | PK compuesta |

Búsqueda (FR-010, FR-011): marcas con datos → modelos de la marca → años del rango (unión de
`anio_desde..anio_hasta`; si no hay vehículos con años, el paso se saltea) → medidas de los
vehículos que cubren ese año más los que no tienen años → productos `activo` con `stock > 0` de
esas medidas, agrupados por gama (económica primero).

## Pedidos (`pedidos`)

### `pedidos`
| Campo | Tipo | Reglas |
| :- | :- | :- |
| id | uuid PK | También `external_reference` de Mercado Pago |
| numero | int | UNIQUE, secuencia desde 1001 (FR-021) |
| token_seguimiento_hash | text | SHA-256 del token del enlace privado (el token no se guarda) |
| estado | enum (ver máquina de estados) | |
| entrega | enum `colocacion`, `retiro` | |
| zona_id | uuid FK → zonas_colocacion | obligatorio si `colocacion` |
| medio_pago | enum `mercadopago`, `transferencia`, `efectivo` | `efectivo` solo con `retiro` (FR-022) |
| subtotal | bigint | |
| descuento | bigint | % configurado si transferencia o efectivo (FR-023) |
| costo_zona | bigint | |
| total | bigint | `subtotal - descuento + costo_zona` |
| descuento_pct_aplicado | numeric(5,2) | Foto del valor usado |
| vence_en | timestamptz | creado + 30 min (MP), + 48 h (transferencia), + 7 días (efectivo) |
| creado_en / actualizado_en | timestamptz | |

Índices: `(estado, vence_en)` para el worker; `(estado, creado_en desc)` para el panel.

### `pedido_items`
| Campo | Tipo | Reglas |
| :- | :- | :- |
| id | uuid PK | |
| pedido_id | uuid FK → pedidos | |
| producto_id | uuid FK → productos | El producto puede quedar `archivado`, nunca borrado |
| nombre_producto | text | Foto al momento de la compra |
| cantidad | int | `CHECK (cantidad > 0)` |
| precio_unitario | bigint | Precio de lista vigente al confirmar |

### `pedido_eventos` (auditoría, FR-033)
| Campo | Tipo | Reglas |
| :- | :- | :- |
| id | uuid PK | |
| pedido_id | uuid FK | |
| de | enum estado | null en la creación |
| a | enum estado | |
| actor | text | `sistema`, `mercadopago`, `worker` o el id del usuario del panel |
| motivo | text | Ej. "vencido", "transferencia confirmada" |
| rechazado | boolean | true si fue un intento inválido |
| creado_en | timestamptz | |

### Máquina de estados (FR-032)

```text
pendiente_pago ──(MP aprobado y monto ok | admin confirma transferencia)──► pagado
pendiente_pago ──(vence: 30 min MP / 48 h transferencia | admin)─────────► cancelado
a_pagar_en_local ──(admin registra efectivo al entregar)─────────────────► entregado
a_pagar_en_local ──(admin)───────────────────────────────────────────────► cancelado
pagado ──(entrega = colocacion)──► en_camino ──► entregado
pagado ──(entrega = retiro)──────► listo_para_retirar ──► entregado
pagado ──(admin)─────────────────► cancelado
```

- Estado inicial: `pendiente_pago` (MP o transferencia) o `a_pagar_en_local` (efectivo).
- Una sola función `cambiarEstado(pedido, a, actor, motivo)` en una transacción: valida la
  transición contra la tabla, bloquea la fila (`FOR UPDATE`), aplica efectos (devolver stock al
  cancelar, registrar pago manual), registra el evento y encola los mails. Una transición inválida
  se rechaza y queda como evento con `rechazado = true`.
- **Stock:** se descuenta al crear (`UPDATE productos SET stock = stock - $n WHERE id = $id AND
  estado = 'activo' AND stock >= $n`); se devuelve solo en la transición a `cancelado`, que puede
  ocurrir una única vez (FR-035).

## Clientes (`clientes`)

### `pedido_compradores`
| Campo | Tipo | Reglas |
| :- | :- | :- |
| pedido_id | uuid PK, FK → pedidos | 1 a 1 |
| nombre | text | |
| dni_cifrado | bytea | AES-256-GCM (IV + tag + texto) (FR-059) |
| dni_clave_version | smallint | Para rotación |
| telefono | text | |
| email | text | |
| calle, numero, referencias | text | obligatorios calle y número si `colocacion` |
| anonimizado_en | timestamptz | Al anonimizar se reemplazan los datos y se completa (FR-061) |

## Pagos (`pagos`)

### `pagos`
| Campo | Tipo | Reglas |
| :- | :- | :- |
| id | uuid PK | |
| pedido_id | uuid FK | |
| medio | enum `mercadopago`, `transferencia`, `efectivo` | |
| id_externo | text | ID de pago de MP; null en manuales |
| estado | text | Estado informado (`approved`, `rejected`…) o `confirmado_manual` |
| monto | bigint | |
| confirmado_por | uuid FK → usuarios_panel | obligatorio en manuales (FR-028, FR-030) |
| payload | jsonb | Respuesta de MP sin datos personales |
| creado_en | timestamptz | |

UNIQUE `(medio, id_externo)` donde `id_externo` no es null (idempotencia, FR-025).

### `alertas`
| Campo | Tipo | Reglas |
| :- | :- | :- |
| id | uuid PK | |
| pedido_id | uuid FK | |
| tipo | enum `monto_distinto`, `pago_sobre_cancelado`, `pago_tardio_transferencia` | |
| detalle | jsonb | |
| resuelta_en / resuelta_por | timestamptz / uuid | |

## Entregas (`entregas`)

### `zonas_colocacion`
| Campo | Tipo | Reglas |
| :- | :- | :- |
| id | uuid PK | |
| nombre | text | UNIQUE. Inicial: "Mar del Plata" |
| costo_extra | bigint | default 0 (FR-017) |
| activa | boolean | |

## Notificaciones (`notificaciones`)

### `outbox_mensajes`
| Campo | Tipo | Reglas |
| :- | :- | :- |
| id | uuid PK | |
| evento | text | `pedido_recibido`, `pago_confirmado`, `en_camino`, `listo_para_retirar`, `entregado`, `cancelado`, `aviso_admin_*` |
| pedido_id | uuid | null para avisos sin pedido |
| destinatario | enum `comprador`, `admin` | |
| datos | jsonb | Lo necesario para la plantilla, **sin DNI** (FR-038) |
| estado | enum `pendiente`, `enviado`, `fallido` | |
| intentos | int | máx. 8 |
| proximo_intento_en | timestamptz | espera exponencial |
| ultimo_error | text | sin datos personales |
| enviado_en | timestamptz | |

UNIQUE `(evento, pedido_id, destinatario)` (FR-040: una sola vez por evento).

## Configuración (`configuracion`)

### `configuracion` (fila única)
| Campo | Tipo | Reglas |
| :- | :- | :- |
| id | smallint PK | `CHECK (id = 1)` |
| descuento_pct | numeric(5,2) | 0–50; inicial 10 (transferencia y efectivo) |
| banco_titular, banco_cbu, banco_alias, banco_cuit | text | |
| whatsapp | text | formato internacional |
| horarios | jsonb | |
| comercio_razon_social, comercio_cuit, comercio_domicilio | text | |
| google_resenas_url | text | FR-076 |
| horas_venc_transferencia | int | 48 |
| minutos_venc_mercadopago | int | 30 |
| dias_venc_efectivo | int | 7 (clarify 2026-11-02) |

## Legales y consultas (`legales`, `canje`)

### `arrepentimientos`
| Campo | Tipo | Reglas |
| :- | :- | :- |
| id | uuid PK | |
| pedido_id | uuid FK null | se vincula si el número existe |
| numero_pedido | int | lo que escribió el comprador |
| nombre, email | text | |
| codigo | text | UNIQUE, legible (ej. `ARR-7K2Q`) (FR-058) |
| creado_en | timestamptz | |

### `consultas_canje`
| Campo | Tipo | Reglas |
| :- | :- | :- |
| id | uuid PK | |
| nombre, telefono | text | obligatorios |
| bateria_usada | text | opcional |
| auto | text | |
| localidad | text | debe ser Mar del Plata o zona activa (FR-004) |
| producto_id | uuid null | desde dónde consultó |
| estado | enum `pendiente`, `atendida` | |
| creado_en | timestamptz | |

## Acceso al panel (`auth`)

### `usuarios_panel`
| Campo | Tipo | Reglas |
| :- | :- | :- |
| id | uuid PK | |
| email | citext | UNIQUE |
| rol | text | `admin` (preparado para más, FR-042) |
| activo | boolean | |

### `enlaces_ingreso`
| Campo | Tipo | Reglas |
| :- | :- | :- |
| token_hash | text PK | SHA-256 |
| usuario_id | uuid FK | |
| vence_en | timestamptz | + 15 min |
| usado_en | timestamptz | un solo uso |

### `sesiones`
| Campo | Tipo | Reglas |
| :- | :- | :- |
| id_hash | text PK | SHA-256 del id de la cookie |
| usuario_id | uuid FK | |
| vence_en | timestamptz | + 30 días (FR-041) |
| revocada_en | timestamptz | cerrar sesión |

## Importación (`importacion`)

### `importaciones`
| Campo | Tipo | Reglas |
| :- | :- | :- |
| id | uuid PK | |
| tipo | enum `productos`, `compatibilidades` | |
| filas_total, filas_ok, filas_error | int | |
| errores | jsonb | `[{fila, campo, motivo}]` (FR-046) |
| usuario_id | uuid | |
| creado_en | timestamptz | |
