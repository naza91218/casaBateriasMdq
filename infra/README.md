# Infraestructura

Esta carpeta junta todo lo que hace falta para levantar la tienda: Docker de desarrollo, la base
y, más adelante, el despliegue en el VPS (fase 9).

## Mails desde el dominio del negocio (FR-039, T118)

En desarrollo los mails van a **Mailpit** (http://localhost:8025) y no salen a internet. En
staging y producción salen por **Resend**, desde una dirección del dominio del negocio, por ejemplo
`pedidos@lacasadelasbaterias.com.ar`. Para que Gmail y Hotmail no los manden a spam, el dominio
tiene que demostrar que Resend puede enviar en su nombre. Eso se hace con tres registros DNS.

### 1. Alta del dominio en Resend

1. Crear la cuenta en [resend.com](https://resend.com) con un mail del negocio, no con uno personal.
2. **Domains → Add domain.** Conviene usar un subdominio solo para los mails, como
   `mail.lacasadelasbaterias.com.ar`: si algún día hay un problema de reputación, no afecta al
   mail del local. Región: **São Paulo (sa-east-1)**, la más cercana.
3. Resend muestra los registros que hay que cargar. Se copian **tal cual** en el panel DNS de
   donde está registrado el dominio (NIC Argentina delega en el proveedor: HostGator, Cloudflare,
   etc.).

### 2. Registros DNS

| Registro | Tipo | Para qué sirve |
| :- | :- | :- |
| **SPF** | `TXT` en `send.mail…` con `v=spf1 include:amazonses.com ~all` (y un `MX` que da Resend) | Dice qué servidores pueden mandar mails del dominio |
| **DKIM** | `TXT` en `resend._domainkey.mail…` con la clave pública que da Resend | Firma cada mail; el receptor comprueba que nadie lo modificó |
| **DMARC** | `TXT` en `_dmarc.lacasadelasbaterias.com.ar` | Dice qué hacer con los mails que fallan SPF o DKIM y a dónde mandar los reportes |

Si el dominio ya tiene un SPF (por ejemplo, del mail de HostGator), **no se crea un segundo
registro**: se agrega el `include:` al existente. Dos registros SPF hacen fallar a los dos.

DMARC, para arrancar:

```
v=DMARC1; p=none; rua=mailto:dmarc@lacasadelasbaterias.com.ar; adkim=r; aspf=r
```

Con `p=none` solo se reciben reportes. Después de 2 a 4 semanas sin fallas se pasa a
`p=quarantine` y, más adelante, a `p=reject`.

### 3. Verificación

1. En Resend, **Verify DNS records**. La propagación tarda entre minutos y unas horas; los tres
   registros tienen que quedar en verde.
2. Crear una API key con permiso **Sending access** solo para ese dominio y cargarla en el `.env`
   del servidor:

   ```
   RESEND_API_KEY=re_...
   MAIL_FROM="La Casa de las Baterías <pedidos@mail.lacasadelasbaterias.com.ar>"
   MAIL_ADMIN=el-mail-del-administrador@...
   ```

3. En staging solo se le manda a `MAIL_ADMIN`, aunque el pedido tenga otro mail: así no se le
   escribe a un comprador real por error.

### 4. Prueba de reputación: 9/10 o más (US4-06)

1. Entrar a [mail-tester.com](https://www.mail-tester.com) y copiar la dirección que muestra.
2. En staging, poner esa dirección como `MAIL_ADMIN`, reiniciar y hacer un pedido de prueba con
   ella como mail del comprador. Al terminar, volver `MAIL_ADMIN` a su valor.
3. Ver el puntaje. Tiene que dar **9/10 o más**. Si da menos, el informe dice qué falta: lo habitual
   es un registro DNS mal copiado o un SPF duplicado.
4. Mandar también un pedido a una casilla de Gmail y comprobar que llegue a **Recibidos**, no a
   Spam ni a Promociones. En Gmail, "Mostrar original" tiene que decir `SPF: PASS`,
   `DKIM: PASS` y `DMARC: PASS`.

Repetir la prueba cada vez que se cambie de dominio, de proveedor de DNS o de remitente.

### Qué ya resuelve el código

- Cada mail sale en HTML y en texto plano, que los filtros de spam valoran.
- Remitente fijo del dominio (`MAIL_FROM`); nunca el mail del comprador.
- Sin adjuntos ni acortadores de enlaces. Todos los enlaces apuntan al dominio de la tienda o a
  `wa.me`.
- Un mail por evento: los reintentos del outbox no generan duplicados (FR-040).

Para ver cómo quedan los mails sin hacer pedidos: `pnpm --filter backend mails:preview` y abrir
`backend/.previews/index.html`.
