# La Casa de las Baterías: tienda online

Tienda online de La Casa de las Baterías (Mar del Plata). El comprador elige su auto y ve las
baterías que le van. Paga con Mercado Pago, con transferencia o en efectivo en el local, y elige
retirarla o que se la coloquen. El administrador gestiona pedidos, catálogo y configuración
desde un panel.

Todo el sistema está descrito en una sola spec:
[specs/001-tienda-online/spec.md](specs/001-tienda-online/spec.md). El plan técnico está en
[plan.md](specs/001-tienda-online/plan.md) y las tareas en
[tasks.md](specs/001-tienda-online/tasks.md).

## Estado

| Parte | Estado |
| :- | :- |
| Backend (API, pagos, mails, panel, catálogo, legales, SEO) | Completo y con tests |
| Scraper de la carga inicial del catálogo | Completo |
| Frontend (tienda y panel) | Completo; la portada usa el diseño nuevo (ver [DESIGN.md](DESIGN.md)) |
| Staging (`staging.casadelasbaterias.com.ar`) | Andando: se despliega solo con cada push a `develop`. Precios y fotos de prueba, Mercado Pago simulado |
| Producción (`casadelasbaterias.com.ar`) | Pendiente: faltan las credenciales de Mercado Pago, la clave nueva de Resend y R2 |

## Cómo levantarlo

Requisitos: Node.js 24, pnpm 10 y Docker Desktop (en Windows, con WSL 2).

```bash
pnpm install
```

```bash
docker compose -f infra/docker-compose.dev.yml up -d
```

```bash
cp backend/.env.example backend/.env
```

```bash
pnpm --filter backend db:migrate
```

```bash
pnpm --filter backend db:seed
```

Después, en tres terminales, la API, el worker (mails y vencimientos) y la tienda:

```bash
pnpm --filter backend dev
```

```bash
pnpm --filter backend worker:dev
```

```bash
pnpm --filter frontend dev
```

| Qué | Dónde |
| :- | :- |
| Tienda y panel | http://localhost:3000 (panel en `/panel`) |
| API | http://localhost:4000/api/v1 |
| Documentación de la API | http://localhost:4000/api/v1/docs |
| Mails de desarrollo (Mailpit) | http://localhost:8025 |
| Base de datos | `localhost:5433`, usuario y contraseña `casa` |

La guía completa, con las validaciones a mano, está en
[quickstart.md](specs/001-tienda-online/quickstart.md).

## Comandos útiles

| Comando | Para qué |
| :- | :- |
| `pnpm test` | Todos los tests (necesita Docker levantado: usa la base `casa_test`) |
| `pnpm lint` y `pnpm typecheck` | Revisión del código |
| `pnpm format` | Formatear con Prettier |
| `pnpm --filter backend db:generate` | Generar una migración después de cambiar un esquema |
| `pnpm --filter backend mails:preview` | Ver todos los mails con datos de ejemplo en `backend/.previews/` |
| `.\backend\scripts\probar-mails.ps1 -Limpiar` | Recorrer el ciclo de un pedido contra la API local y ver los mails en Mailpit (PowerShell) |
| Plantillas de Excel para cargar productos y autos | [docs/plantillas/](docs/plantillas) (se guardan como CSV y se suben en Panel → Importar) |
| `pnpm --filter @casa/scraper scrape` | Armar las planillas de catálogo y compatibilidades ([README](tools/scraper/README.md)) |

## Mapa de carpetas

```
backend/              API REST (Fastify) y worker
  src/modules/        Un módulo por tema: pedidos, pagos, catalogo, compatibilidad,
                      clientes, notificaciones, legales, auth, configuracion,
                      entregas, canje, importacion
    <modulo>/domain/        Reglas puras (sin base ni framework)
    <modulo>/application/   Casos de uso
    <modulo>/infrastructure/ Esquema de la base y consultas
    <modulo>/http/          Rutas
  src/adapters/       Mercado Pago, mails, fotos, revalidación del frontend
  src/platform/       Base, configuración, logger, cifrado, Sentry
  src/shared-kernel/  Dinero, errores, reloj, WhatsApp, privacidad
  src/composition-root.ts   Donde se arman los servicios con sus dependencias
  db/migrations/      Migraciones SQL (generadas con drizzle-kit)
  db/seed/            Datos iniciales y de ejemplo
  tests/              unit, integration (contra la base de pruebas) y contract (HTTP)
shared/               Contratos Zod compartidos entre backend y frontend
frontend/             Next.js: tienda (app/(tienda)) y panel (app/panel)
tools/scraper/        Carga inicial del catálogo desde fuentes públicas y el PDF de Sermat
infra/                Docker, Nginx, scripts de deploy y backup, y guía del dominio y del servidor
specs/                Spec, plan, tareas y checklists (spec-kit)
data/                 Planillas y fotos de importación (fuera de git)
docs/                 Specs anteriores, entregables y plantillas de carga
```

## Cómo se trabaja

- El proyecto sigue **spec-driven development** con spec-kit: primero la spec, después el plan,
  las tareas y la implementación. Los principios están en la
  [constitución](.specify/memory/constitution.md).
- Cada escenario de la spec tiene su test con el código en el nombre (`US2-09`). El mapa está en
  [cobertura-tests.md](specs/001-tienda-online/checklists/cobertura-tests.md).
- La revisión de seguridad está en
  [seguridad.md](specs/001-tienda-online/checklists/seguridad.md).
- Ramas: `develop` se despliega solo en staging; producción se publica desde `main` con el
  workflow "Deploy producción", que pide aprobación. El desarrollo va en `001-tienda-online` y se
  pasa a `develop` para probarlo en staging. El paso a paso del servidor está en
  [infra/README.md](infra/README.md).
