# Quickstart: cómo levantar y validar el backend

**Feature**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md)

Guía para comprobar que el sistema funciona. No tiene código de implementación: los detalles
están en [data-model.md](data-model.md) y [contracts/](contracts/).

## Requisitos

- Node.js 24 LTS y pnpm 10.
- Docker Desktop (en Windows, con WSL 2).
- Git.

## Levantar el entorno de desarrollo

```bash
pnpm install
```

```bash
docker compose -f infra/docker-compose.dev.yml up -d
```

Levanta PostgreSQL 17 (puerto 5432) y Mailpit (bandeja de mails en `http://localhost:8025`).

```bash
cp backend/.env.example backend/.env
```

Completar las variables; en desarrollo los valores de ejemplo alcanzan, salvo las credenciales de
prueba de Mercado Pago si se quiere probar el pago real en sandbox.

```bash
pnpm --filter backend db:migrate
```

```bash
pnpm --filter backend db:seed
```

Carga marcas, medidas, una zona "Mar del Plata", configuración inicial, un usuario del panel y
productos y vehículos de ejemplo (incluido el Gol Trend 2008–2023 → 12x65 de la spec).

```bash
pnpm --filter backend dev
```

API en `http://localhost:4000/api/v1`, documentación en `http://localhost:4000/api/v1/docs`.

```bash
pnpm --filter backend worker:dev
```

Worker de mails y vencimientos.

## Validaciones automáticas

```bash
pnpm test
```

Corre unitarias, de integración (contra la base de pruebas) y de contrato. Cada test lleva el
escenario de la spec en el nombre (`US2-03`, `US3-03`…).

```bash
pnpm lint
```

```bash
pnpm typecheck
```

## Validaciones manuales clave

| # | Escenario | Cómo | Resultado esperado |
| :- | :- | :- | :- |
| 1 | Buscador (US1-01) | `GET /vehiculos/compatibles?marca=volkswagen&modelo=gol-trend&anio=2015` | Dos baterías 12x65, económica primero |
| 2 | Auto no cargado (US1-03) | Mismo endpoint con un modelo inexistente | `sinResultados: "auto_no_cargado"` y URL de WhatsApp con el auto |
| 3 | Transferencia (US2-06) | `POST /pedidos` con `medioPago: transferencia` y un producto de $100.000 | Total $90.000, `venceEn` a 48 h, mail en Mailpit con CBU/alias |
| 4 | Efectivo con colocación (US2-05) | `POST /checkout/cotizar` con `entrega: colocacion` | `efectivo` no figura entre los medios |
| 5 | Última unidad (US2-03) | Test de integración de concurrencia | Un solo pedido, stock 0 |
| 6 | Confirmar transferencia (US3-03) | Ingresar al panel (enlace en Mailpit) → `POST /admin/pedidos/:id/confirmar-transferencia` | `pagado`, evento con el usuario, mail al comprador |
| 7 | Vencimiento MP | Crear pedido con Mercado Pago y adelantar el reloj de pruebas 31 min | `cancelado`, stock devuelto, mail de cancelación |
| 8 | Webhook (US2-07, US2-09, US2-10) | Tests de contrato con firmas válidas, repetidas e inválidas | Pagado una vez; firma inválida → 401 |
| 9 | Importación (US5-01) | `POST /admin/importaciones` con la planilla de ejemplo con 2 filas inválidas | 18 ok, informe con fila y motivo |
| 10 | Revisión (US5-05) | `POST /admin/productos/revision` habilitar y eliminar | Solo los habilitados aparecen en `/catalogo/productos` |
| 11 | DNI (SC-012) | Buscar el DNI de prueba en logs, mails de Mailpit y respuestas públicas | No aparece |

## Pago en sandbox de Mercado Pago (staging)

1. Crear un pedido con Mercado Pago en `staging.<dominio>`.
2. Pagar con un usuario comprador de prueba y una tarjeta de prueba aprobada.
3. Verificar: pedido `pagado`, pago registrado, mails al comprador y al admin.
4. Repetir con una tarjeta de prueba rechazada: el pedido sigue pendiente y se puede reintentar.

## Restaurar un backup (FR-062)

Procedimiento en `infra/README.md`: bajar el último dump de R2, restaurarlo en una base nueva de
staging y verificar que el catálogo y los pedidos se ven. Objetivo: menos de 2 horas (SC-010).
