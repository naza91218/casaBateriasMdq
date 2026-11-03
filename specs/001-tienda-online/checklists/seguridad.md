# Revisión de seguridad del backend (T146)

Revisión hecha el 30/10/2026 sobre el backend completo (fases 1 a 8 y 10). Para cada punto se
anota qué hay, dónde y qué test lo cubre. Al final, lo que queda para el servidor (fase 9).

## Corregido en esta revisión

| Hallazgo | Riesgo | Corrección | Test |
| :- | :- | :- | :- |
| Sin cabeceras de seguridad | Que un sitio embeba la API en un iframe o que el navegador adivine tipos de archivo | `@fastify/helmet`: `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, HSTS de 180 días sin subdominios, CSP `default-src 'none'` en producción | `contract/seguridad/cabeceras.test.ts` |
| `trustProxy: true` | Cualquiera podía inventar su IP con `X-Forwarded-For` y esquivar los límites de intentos (login, checkout, formularios) | Solo se confía en un proxy de la máquina o de la red interna de Docker (`loopback`, `uniquelocal`) | `cabeceras.test.ts` (IP real) |
| Acciones del panel sin control de origen | Un sitio malicioso podría disparar acciones con la sesión del admin (CSRF) | Además de la cookie `SameSite=Lax`, toda acción de `/admin` que no sea lectura se rechaza (403) si llega con `Origin` de otro sitio o `Sec-Fetch-Site: cross-site` | `cabeceras.test.ts` (CSRF) |
| Un servidor arrancaba sin Mercado Pago | En producción se habría usado la pasarela simulada de desarrollo | En staging y producción no arranca si faltan `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET` o `RESEND_API_KEY` | `unit/platform/config.test.ts` |
| Claves de ejemplo aceptadas en un servidor | Con la clave de ejemplo, el DNI cifrado se descifra con un valor público | En staging y producción no arranca si `DNI_ENCRYPTION_KEY` o `REVALIDATE_SECRET` tienen el valor de `.env.example` | `config.test.ts` |
| `SESSION_SECRET` en `.env.example` sin uso | Confunde: hace creer que algo depende de ese secreto | Se sacó; las sesiones son identificadores al azar guardados en la base | — |
| 23 avisos de `pnpm audit` | `nodemailer` (5 altos) y `@fastify/static` (por la documentación) | `nodemailer` 10.1.7 y `@fastify/swagger-ui` 6.1.2 | `pnpm audit` |

## Revisado y en orden

| Tema | Estado |
| :- | :- |
| **Secretos** | Ninguno en el repositorio ni en el historial (`git grep` de claves de Mercado Pago, Resend, AWS y llaves privadas). `.env` ignorado por git; solo se versiona `.env.example`. La configuración se valida al arrancar. |
| **DNI** | Cifrado con AES-256-GCM, con versión de clave para rotarla. Solo el detalle del pedido en el panel lo descifra. Ninguna respuesta pública ni mail lo incluye (`sin-dni.test.ts`, `mails.test.ts`). |
| **Datos personales en registros** | El logger oculta los campos personales. Los errores se registran y se mandan a Sentry con mails y números largos tapados y sin el detalle de la base (`legales.test.ts`, US7-04). |
| **Inyección** | Todas las consultas son parametrizadas (Drizzle). Cargas típicas de SQL injection probadas en todos los endpoints públicos y el login (`inyeccion.test.ts`). React escapa los textos de los mails. |
| **Panel** | Ingreso por enlace de un solo uso que vence a los 15 minutos, con la misma respuesta para mails autorizados y no autorizados. Cookie `httpOnly`, `Secure` fuera de desarrollo y `SameSite=Lax`. Toda ruta `/admin` exige sesión antes de leer el cuerpo (401). |
| **Mercado Pago** | El webhook verifica la firma; nunca se confía en lo que trae el aviso: se consulta el pago a la API y se compara el monto. Avisos repetidos se procesan una vez. |
| **Seguimiento del pedido** | El enlace lleva un token firmado (HMAC); sin él, 404. |
| **Límites de intentos** | Ingreso al panel (5/min), verificación del enlace (20/min), checkout (10/min), cotizar (60/min), reintentar pago (10/min), canje y arrepentimiento (5/min), por IP. |
| **Archivos subidos** | Fotos: hasta 5 MB cada una y 10 por envío, convertidas a WebP con `sharp` (descarta lo que no es imagen y borra los metadatos EXIF). Planillas: 5 MB y 5.000 filas. Rutas de fotos con protección contra `../` y URLs con protección contra SSRF. |
| **Planillas descargadas** | Las celdas que empiezan con `= + - @` se escapan para que Excel no las ejecute. |
| **CORS** | No se habilita: el navegador llama a la API por el mismo dominio (`/api` detrás de Nginx), así que ningún otro sitio puede leer respuestas. |
| **Errores** | Formato único, sin trazas ni mensajes internos hacia afuera (`ERROR_INTERNO`). |
| **Documentación de la API** | Swagger está apagado en producción. |

## Auditoría a fondo (02/11/2026)

Segunda pasada, sobre la lógica del negocio y no solo la configuración.

| Hallazgo | Riesgo | Corrección | Test |
| :- | :- | :- | :- |
| Pedidos sin pagar retienen stock sin límite | Cualquiera podía dejar el local "sin stock": cada pedido reserva stock (48 h la transferencia, el efectivo hasta que se cancela), con hasta 100 unidades por pedido repitiendo líneas | Hasta 10 baterías por pedido y sin repetir el producto; hasta 3 pedidos sin pagar por comprador, por mail o teléfono (`MAX_PEDIDOS_SIN_PAGAR`) | `integration/pedidos/crear-pedido.test.ts` |
| Mercado Pago no cobraba el costo de la zona | No es de seguridad, pero rompía la compra: un pedido con colocación en una zona con costo extra cobraba de menos y quedaba como "monto distinto" | La zona va como una línea más y se verifica que la preferencia sume el total del pedido | `integration/pagos/preferencia.test.ts` |
| Descarga de fotos controlada solo por el nombre | Un dominio que resuelve a una IP interna, o direcciones como `[::ffff:127.0.0.1]`, pasaban el control (SSRF; solo desde el panel) | Se controla la IP real al conectarse, con todas las redes no públicas de IPv4 e IPv6 | `integration/importacion/importacion.test.ts` |
| Tokens en los registros | La URL completa quedaba registrada, con el token del seguimiento (no vence) y el del enlace al panel | Registro propio de cada pedido HTTP con `t` y `token` tapados | `contract/seguridad/registros.test.ts` |
| Cambio de CBU sin aviso | Alguien que entrara al panel podía cambiar el CBU y quedarse con las transferencias sin que nadie se enterara | Mail al administrador con quién lo cambió y cómo quedó | `integration/configuracion/admin-configuracion.test.ts` |

Revisado sin hallazgos: ingreso al panel (tokens con hash, de un solo uso y comparados en tiempo
constante), sesiones, seguimiento y reintento de pago (exigen el token firmado), webhook (firma,
consulta a la API, monto y estados), importes calculados en el servidor y subida de fotos.

**Decidido el 02/11/2026:** los pedidos en efectivo, que antes no vencían, ahora vencen a los 7
días (clarify 2026-11-02). Así ningún pedido retiene stock para siempre.

## Riesgos aceptados

- **`esbuild` (moderado)**, dentro de `drizzle-kit`, que solo se usa en desarrollo para generar
  migraciones. El problema afecta al servidor de desarrollo de esbuild, que no se usa. Se revisa
  cuando `drizzle-kit` actualice esa dependencia.
- **Sesión del panel de 30 días.** Es cómoda para un único administrador en la PC del local. Si
  se suman usuarios o se usa el panel desde el celular, conviene bajarla a 7 días.

## Para la fase 9 (servidor)

- **Nginx:** `limit_req` para las rutas públicas de lectura (catálogo, buscador), que hoy no
  tienen límite propio, y redirección `http → https` (US7-05).
- **Red:** la API y la base solo accesibles desde la red interna de Docker; solo Nginx expone los
  puertos 80 y 443. Eso es lo que hace segura la confianza en `X-Forwarded-For`.
- **Base de datos:** un usuario de la aplicación sin permisos de superusuario.
- **Copias:** cifradas antes de subirlas a R2 (contienen el DNI cifrado y datos de contacto).
- **`.env` del servidor:** con permisos `600` y claves distintas por entorno.
- **Staging:** protegido con usuario y contraseña en Nginx (tiene la documentación de la API).
- **Dependencias:** `pnpm audit --prod` en GitHub Actions; que falle con avisos altos.
