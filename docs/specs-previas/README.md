# Specs — Tienda online de La Casa de las Baterías

> **Archivado el 28/10/2026.** Estas specs fueron la base de la spec única de spec-kit en `specs/001-tienda-online/`. La constitución vigente está en `.specify/memory/constitution.md`.

Desarrollo guiado por especificaciones: **primero se escribe y aprueba qué tiene que pasar, después se programa**. Ningún código entra sin un requisito que lo pida, y ningún requisito se da por cumplido sin su criterio de aceptación verificado.

## Flujo

```text
constitucion.md ──► spec.md (qué y por qué) ──► PLAN_TECNICO.md (cómo) ──► tareas.md (pasos) ──► código + tests
        ▲                                                                                          │
        └──────────────────── si algo cambia, se cambia la spec primero ◄──────────────────────────┘
```

1. **Especificar:** se escribe o ajusta el `spec.md` de la funcionalidad. Estado `borrador`.
2. **Aclarar:** se resuelven las preguntas abiertas con Juan. Estado `aprobada`.
3. **Planificar:** se revisa que [PLAN_TECNICO.md](../../PLAN_TECNICO.md) cubra cada requisito.
4. **Tareas:** se agregan en [tareas.md](tareas.md), cada una con los requisitos que cumple.
5. **Implementar:** cada criterio de aceptación tiene su test (Vitest o Playwright) con el ID en el nombre, por ejemplo `test("CA-PED-03: ...")`.
6. **Cerrar:** todos los criterios pasan. Estado `hecha`.

## Convenciones

| Elemento | Formato | Ejemplo |
| :- | :- | :- |
| Requisito | `R-<ÁREA>-<NN>`, redactado con **debe** | `R-PED-02` La tienda debe descontar el stock al crear el pedido |
| Criterio de aceptación | `CA-<ÁREA>-<NN>`, en **Dado / Cuando / Entonces** | `CA-PED-03` |
| Pregunta abierta | `P<n>` (de `PROCESO_DE_DESARROLLO.md` §10) o `Q-<ÁREA>-<NN>` | `Q-ENT-01` |
| Commit / PR | Referencia el ID | `feat(pedidos): reserva atómica de stock [R-PED-02]` |

## Índice

| # | Spec | Área | Estado |
| :- | :- | :- | :- |
| — | [Constitución](constitucion.md) | Principios | borrador |
| 001 | [Catálogo](001-catalogo/spec.md) | `CAT` | borrador |
| 002 | [Buscador por auto](002-buscador-por-auto/spec.md) | `BUS` | borrador |
| 003 | [Checkout y pedidos](003-checkout-y-pedidos/spec.md) | `PED` / `ENT` | borrador |
| 004 | [Pagos](004-pagos/spec.md) | `PAG` | borrador |
| 005 | [Notificaciones](005-notificaciones/spec.md) | `NOT` | borrador |
| 006 | [Panel](006-panel/spec.md) | `PAN` | borrador |
| 007 | [Contenido, SEO y medición](007-contenido-seo-y-medicion/spec.md) | `SEO` | borrador |
| 008 | [Legales y datos personales](008-legales-y-datos-personales/spec.md) | `LEG` | borrador |
| 009 | [Operación](009-operacion/spec.md) | `OPS` | borrador |
| — | [Tareas](tareas.md) | Trazabilidad | borrador |

## Usar las specs con Claude Code

Para implementar una tarea: *"Implementá T3.2 según `specs/003-checkout-y-pedidos/spec.md`; escribí primero los tests de CA-PED-03 y CA-PED-04"*. Las specs son la fuente de verdad: si el código y la spec no coinciden, se corrige uno de los dos de forma explícita, nunca en silencio.
