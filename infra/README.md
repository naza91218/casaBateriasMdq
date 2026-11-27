# Infraestructura

Esta carpeta junta todo lo que hace falta para levantar la tienda: Docker de desarrollo, la base
y el despliegue en el VPS.

## Mails desde el dominio del negocio (FR-039, T118)

En desarrollo los mails van a **Mailpit** (http://localhost:8025) y no salen a internet. En
staging y producción salen por **Resend**, desde una dirección del dominio del negocio, por ejemplo
`pedidos@casadelasbaterias.com.ar`. Para que Gmail y Hotmail no los manden a spam, el dominio
tiene que demostrar que Resend puede enviar en su nombre. Eso se hace con tres registros DNS.

### 1. Alta del dominio en Resend

1. Crear la cuenta en [resend.com](https://resend.com) con un mail del negocio, no con uno personal.
2. **Domains → Add domain.** Conviene usar un subdominio solo para los mails, como
   `mail.casadelasbaterias.com.ar`: si algún día hay un problema de reputación, no afecta al
   mail del local. Región: **São Paulo (sa-east-1)**, la más cercana.
3. Resend muestra los registros que hay que cargar. Se copian **tal cual** en el panel DNS de
   donde está registrado el dominio (NIC Argentina delega en el proveedor: HostGator, Cloudflare,
   etc.).

### 2. Registros DNS

| Registro | Tipo | Para qué sirve |
| :- | :- | :- |
| **SPF** | `TXT` en `send.mail…` con `v=spf1 include:amazonses.com ~all` (y un `MX` que da Resend) | Dice qué servidores pueden mandar mails del dominio |
| **DKIM** | `TXT` en `resend._domainkey.mail…` con la clave pública que da Resend | Firma cada mail; el receptor comprueba que nadie lo modificó |
| **DMARC** | `TXT` en `_dmarc.casadelasbaterias.com.ar` | Dice qué hacer con los mails que fallan SPF o DKIM y a dónde mandar los reportes |

Si el dominio ya tiene un SPF (por ejemplo, del mail de HostGator), **no se crea un segundo
registro**: se agrega el `include:` al existente. Dos registros SPF hacen fallar a los dos.

DMARC, para arrancar:

```
v=DMARC1; p=none; rua=mailto:dmarc@casadelasbaterias.com.ar; adkim=r; aspf=r
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
   MAIL_FROM="La Casa de las Baterías <pedidos@mail.casadelasbaterias.com.ar>"
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

## Servidor (VPS): staging y producción (T131)

Un solo VPS (Ubuntu 22.04 o 24.04; 2 GB de RAM alcanzan, el de HostGator tiene 4 GB y SSH en el puerto 22022) corre los dos entornos con Docker. Nginx, en el
propio servidor, recibe el tráfico, pone el HTTPS y lo pasa a los contenedores, que solo
escuchan en `127.0.0.1`.

```
/srv/casa/
├── scripts/            deploy.sh, backup.sh, restore.sh (los copia GitHub Actions)
├── staging/            docker-compose.yml, .env, .tag-actual, .tag-anterior
└── produccion/         ídem
```

| Archivo | Para qué |
| :- | :- |
| `docker-compose.yml` | base, API, worker y tienda de un entorno |
| `env.servidor.example` | modelo del `.env` de cada entorno |
| `nginx/` | `comun.conf` (rutas), `produccion.conf`, `staging.conf` (clave y noindex) |
| `scripts/deploy.sh` | migraciones, cambio de contenedores, chequeo y vuelta atrás |
| `scripts/backup.sh`, `restore.sh` | copias diarias a R2 y restauración |

### 1. Preparación del servidor (una vez)

```bash
# Como root
apt update && apt upgrade -y
apt install -y nginx certbot python3-certbot-nginx apache2-utils rclone ufw
curl -fsSL https://get.docker.com | sh
ufw allow OpenSSH && ufw allow 'Nginx Full' && ufw enable

# Usuario con el que despliega GitHub Actions
adduser --disabled-password deploy
usermod -aG docker deploy
mkdir -p /srv/casa/{scripts,staging,produccion} && chown -R deploy:deploy /srv/casa
```

- **Clave SSH:**
  - en la PC, `ssh-keygen -t ed25519 -f casa-deploy`;
  - la clave pública va a `/home/deploy/.ssh/authorized_keys`;
  - la privada va al secreto `SSH_KEY` de GitHub.
- **Sin contraseñas:** poner `PasswordAuthentication no` en `/etc/ssh/sshd_config`.
- **Acceso a GHCR:** para bajar las imágenes, entrar como `deploy` y correr `docker login ghcr.io -u <usuario>` con un token de GitHub que tenga solo `read:packages`.

### 2. Nginx y HTTPS

Los registros DNS `A` del dominio, de `www` y de `staging` tienen que apuntar ya a la IP del VPS.
Los certificados se sacan primero, con el sitio por defecto de Nginx, porque las configuraciones
de la tienda los necesitan para arrancar.

```bash
apt install -y apache2-utils
mkdir -p /etc/nginx/casa /var/www/certbot

# 1. Certificados (pide un mail para avisos de vencimiento y aceptar los términos)
certbot certonly --webroot -w /var/www/html -d casadelasbaterias.com.ar -d www.casadelasbaterias.com.ar
certbot certonly --webroot -w /var/www/html -d staging.casadelasbaterias.com.ar

# 2. Configuración de la tienda (los .conf se copian antes desde la PC con scp)
cp /tmp/comun.conf /etc/nginx/casa/
cp /tmp/produccion.conf /etc/nginx/sites-available/casa-produccion
cp /tmp/staging.conf /etc/nginx/sites-available/casa-staging
ln -s /etc/nginx/sites-available/casa-produccion /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/casa-staging /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
htpasswd -c /etc/nginx/casa/staging.htpasswd cliente
nginx -t && systemctl reload nginx

# 3. Las renovaciones usan la carpeta que ahora sirve Nginx
sed -i 's#/var/www/html#/var/www/certbot#' /etc/letsencrypt/renewal/*.conf
certbot renew --dry-run
```

Nginx 1.18 (Ubuntu 22.04) no entiende `http2 on;`: por eso los `.conf` usan `listen 443 ssl http2`.
Certbot renueva los certificados solo; para comprobarlo, `systemctl list-timers | grep certbot`.

### 3. Variables por entorno

Copiar `env.servidor.example` a `/srv/casa/<entorno>/.env`, completarlo y correr `chmod 600`. Esto es lo que cambia entre los dos entornos:

| Variable | Staging | Producción |
| :- | :- | :- |
| `NODE_ENV` | `staging` | `production` |
| `PUERTO_API` / `PUERTO_WEB` | 4001 / 3001 | 4000 / 3000 |
| URLs | `https://staging.…` | `https://casadelasbaterias.com.ar` |
| Mercado Pago | vacío (pasarela simulada) o credenciales de prueba | credenciales reales; vacío = el checkout no ofrece Mercado Pago, solo transferencia y efectivo |
| `DNI_ENCRYPTION_KEY`, `REVALIDATE_SECRET`, `POSTGRES_PASSWORD` | propias | propias |

Si falta alguna variable obligatoria, la API no arranca y el deploy vuelve solo a la versión anterior.

En GitHub, en **Settings → Environments**, crear `staging` y `produccion` con:

- **secretos:** `SSH_HOST`, `SSH_USER` (`deploy`), `SSH_KEY` y `SSH_KNOWN_HOSTS` (la salida de `ssh-keyscan -p 22022 <ip>`);
- **variables:** `SSH_PORT` (22022), `SITIO_URL`, `GA4_ID` y `META_PIXEL_ID`, que quedan fijas en la imagen de la tienda;
- **solo en `produccion`:** **Required reviewers**, con quien aprueba los pases.

### Credenciales de Mercado Pago

Las saca el dueño de la cuenta que cobra, en [mercadopago.com.ar/developers](https://www.mercadopago.com.ar/developers):

1. **Tus integraciones → Crear aplicación**: tipo *Pagos online*, sin plataforma de e-commerce, producto *Checkout Pro*.
2. **Credenciales de producción**: completar rubro y sitio si lo pide, y copiar el **Access Token** (`APP_USR-…`) en `MP_ACCESS_TOKEN`. La Public Key no se usa.
3. **Webhooks → Configurar notificaciones**:
   - modo productivo: `https://casadelasbaterias.com.ar/api/v1/webhooks/mercadopago`;
   - evento: solo *Pagos*;
   - copiar la **clave secreta** en `MP_WEBHOOK_SECRET`.
4. Para probar en staging: **Cuentas de prueba** (vendedor y comprador), credenciales del vendedor de prueba y, en modo de prueba, la URL `https://staging.casadelasbaterias.com.ar/api/v1/webhooks/mercadopago`.

Las claves van directo al `.env` del servidor, nunca por chat ni al repo. Después de cargarlas: `docker compose up -d backend worker` en la carpeta del entorno.

### 4. Desplegar

- **Staging:** cada push a `develop` corre los tests, construye las imágenes y despliega. Si algo
  falla, staging queda como estaba (US8-02).
- **Producción:** desde Actions → *Deploy producción* → *Run workflow* sobre `main`, después de
  probar ese mismo commit en staging. Espera la aprobación.

`deploy.sh` hace esto:

1. Corre las migraciones con la imagen nueva **antes** de tocar los contenedores. Si fallan, no se cambia nada.
2. Cambia los contenedores.
3. Espera a que responda `/api/v1/salud`. Si no responde en 60 s, vuelve a la versión anterior.

Para volver atrás a mano:

```bash
/srv/casa/scripts/deploy.sh produccion --rollback
```

El deploy aplica también los datos mínimos:

- el usuario del panel (`MAIL_ADMIN`);
- las marcas;
- las medidas.

Para entrar al panel la primera vez se pide el enlace de ingreso a ese mail y desde el panel se pone la contraseña. Después se entra con mail y contraseña; el enlace queda para recuperarla.

### 5. Copias de seguridad (US8-01)

En Cloudflare R2:

1. Crear el bucket `casa-backups`, aparte del de las fotos.
2. Crear un token con permiso solo sobre ese bucket.
3. Como `deploy`, correr `rclone config` y crear el remoto `r2`:
   - tipo *S3*;
   - proveedor *Cloudflare*;
   - endpoint `https://<account_id>.r2.cloudflarestorage.com`.

```bash
crontab -e   # usuario deploy
15 4 * * * /srv/casa/scripts/backup.sh produccion >> /home/deploy/casa-backup.log 2>&1
```

Cada día queda un `pg_dump` comprimido en `r2:casa-backups/produccion/`, y se borran los de más
de 30 días. Las fotos ya viven en R2 y no hace falta copiarlas.

**Restauración probada (objetivo: menos de 2 horas).** Una vez por mes, y siempre antes de la
entrega, restaurar la copia de producción en staging y revisar que estén los pedidos del día
anterior:

```bash
/srv/casa/scripts/restore.sh staging
```

Sin otro argumento, toma la copia más reciente de producción.

Si se pierde el servidor entero:

1. Preparar un VPS nuevo con los pasos 1 a 3.
2. Correr `deploy.sh produccion <tag>` con la última etiqueta buena.
3. Correr `restore.sh produccion`.

Hace falta la misma `DNI_ENCRYPTION_KEY`: guardarla en el gestor de contraseñas del negocio.

### 6. Monitor de caídas (US8-03)

En [UptimeRobot](https://uptimerobot.com) (gratis), crear un monitor **HTTP(s)**:

- dirección: `https://casadelasbaterias.com.ar/api/v1/salud`;
- frecuencia: cada **5 minutos**;
- aviso al responsable por mail y por Telegram.

La ruta responde 503 si la base no anda, así que el monitor avisa aunque la tienda cargue.

### 7. Entrega de cuentas (US8-04)

Al entregar, todas las cuentas quedan a nombre del negocio, con su mail, y el desarrollador queda
como invitado. Acta para firmar:

| Cuenta | Para qué | Titular | Acceso del desarrollador |
| :- | :- | :- | :- |
| Dominio (NIC Argentina) | dirección de la tienda | | |
| DNS (Cloudflare u otro) | registros del dominio y del mail | | |
| VPS | servidor | | |
| GitHub (repositorio y GHCR) | código y despliegues | | |
| Cloudflare R2 | fotos y copias | | |
| Resend | mails | | |
| Mercado Pago | cobros | | |
| UptimeRobot | monitor | | |
| Google Analytics / Search Console, Meta | mediciones | | |
| Gestor de contraseñas | claves, incluida `DNI_ENCRYPTION_KEY` | | |

### 8. Guía de soporte

**La tienda no carga.**

1. Mirar si UptimeRobot avisó.
2. En el servidor, `cd /srv/casa/produccion && docker compose ps`. Si algún contenedor no está
   *Up* o *healthy*, ver sus registros con `docker compose logs --tail 100 backend` (o `frontend`, o `db`).
3. Si empezó con un deploy: `deploy.sh produccion --rollback`.
4. Si el disco está lleno (`df -h`): `docker system prune -f`.

**Un pago no se acreditó.**

1. En el panel, ver el pedido y su estado.
2. En Mercado Pago, buscar el pago por el número de pedido.
3. Si Mercado Pago lo muestra aprobado y el pedido no, revisar `docker compose logs backend | grep webhook`.
   Mercado Pago reintenta los avisos solo; si pasaron horas, marcar el pedido como pagado desde el panel.

**Un mail no llegó.**

1. Pedir al comprador que mire Spam y Promociones.
2. En Resend → *Emails*, buscar la dirección: dice si se entregó, rebotó o quedó en cola.
3. Si no figura, `docker compose logs worker`: los envíos fallidos se reintentan solos.

**El stock no coincide.**

1. Revisar en el panel los pedidos pendientes de ese producto: reservan stock hasta que vencen.
2. Corregir el número en la ficha del producto. La tienda se actualiza sola en segundos.
