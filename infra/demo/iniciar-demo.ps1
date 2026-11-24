# Demo para el cliente: corre la tienda en esta PC y la publica en internet con un túnel de
# Cloudflare (una dirección https://algo.trycloudflare.com que cambia cada vez que se inicia).
#
#   .\infra\demo\iniciar-demo.ps1             arranca todo (la primera vez compila el frontend)
#   .\infra\demo\iniciar-demo.ps1 -Compilar   vuelve a compilar el frontend (después de cambios)
#   .\infra\demo\iniciar-demo.ps1 -Reiniciar  vuelve a copiar la base desde casa_dev, sin pedidos
#   .\infra\demo\detener-demo.ps1             apaga todo
#
# Está separada de desarrollo: base casa_demo, API en 4100, tienda en 3100 y un Mailpit propio
# (1026/8026) donde caen todos los mails, incluido el enlace para entrar al panel.
# Mientras dure la demo la PC tiene que quedar prendida y con internet.
param([switch]$Compilar, [switch]$Reiniciar)
$ErrorActionPreference = 'Continue'

$raiz = (Resolve-Path "$PSScriptRoot\..\..").Path
$estado = Join-Path $PSScriptRoot '.estado'
New-Item -ItemType Directory -Force $estado | Out-Null
$ADMIN = 'admin@demo.casadelasbaterias.com'

if (Test-Path "$estado\procesos.json") {
  # Si la PC se reinicio, el archivo queda pero los procesos ya no existen.
  $vivos = (Get-Content "$estado\procesos.json" -Raw | ConvertFrom-Json).procesos |
    Where-Object { Get-Process -Id $_ -ErrorAction SilentlyContinue | Where-Object { $_.ProcessName -in 'node', 'cloudflared' } }
  if ($vivos) {
    Write-Host 'La demo ya esta corriendo. Apagala con .\infra\demo\detener-demo.ps1' -ForegroundColor Yellow
    exit 1
  }
  Remove-Item "$estado\procesos.json"
}

$cloudflared = 'C:\Program Files (x86)\cloudflared\cloudflared.exe'
if (-not (Test-Path $cloudflared)) { $cloudflared = (Get-Command cloudflared -ErrorAction Stop).Source }

function Psql([string]$base, [string]$sql) {
  docker exec infra-db-1 psql -U casa -d $base -tAc $sql
}

# 1. Base de datos y Mailpit
Write-Host '1/5 Base de datos y Mailpit...'
# Docker Desktop recien abierto tarda en responder: sin esperarlo, todo lo que sigue falla.
for ($i = 0; $i -lt 60; $i++) {
  docker info 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) { break }
  if ($i -eq 0) { Write-Host '    Esperando a que Docker Desktop termine de arrancar...' }
  Start-Sleep -Seconds 5
}
if ($LASTEXITCODE -ne 0) { throw 'Docker no responde. Abri Docker Desktop y proba de nuevo.' }
docker compose -f "$raiz\infra\docker-compose.dev.yml" up -d --wait db | Out-Null

$existe = Psql 'postgres' "select 1 from pg_database where datname = 'casa_demo'"
if ($Reiniciar -or -not $existe) {
  # Copia de desarrollo (catalogo, autos y configuracion) sin pedidos ni datos de personas.
  Psql 'postgres' 'drop database if exists casa_demo with (force)' | Out-Null
  Psql 'postgres' 'create database casa_demo' | Out-Null
  docker exec infra-db-1 sh -c 'pg_dump -U casa casa_dev | psql -q -U casa -d casa_demo' | Out-Null
  Psql 'casa_demo' 'truncate pedidos, pedido_items, pedido_compradores, pedido_eventos, pagos, outbox_mensajes, sesiones, enlaces_ingreso, consultas_canje, arrepentimientos, alertas, importaciones cascade' | Out-Null
  Psql 'casa_demo' 'delete from usuarios_panel' | Out-Null
  Psql 'casa_demo' "insert into usuarios_panel (id, email) values (gen_random_uuid(), '$ADMIN')" | Out-Null
}

docker inspect casa-demo-mailpit 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
  # Sin clave: el cliente entra directo desde el panel. Solo tiene mails de la demo.
  docker run -d --name casa-demo-mailpit --restart unless-stopped -p 1026:1025 -p 8026:8025 axllent/mailpit:latest | Out-Null
} else {
  docker start casa-demo-mailpit | Out-Null
}

# 2. Tuneles
Write-Host '2/5 Abriendo los tuneles de Cloudflare...'
$procesos = @()
function Abrir-Tunel([int]$puerto, [string]$nombre) {
  $log = "$estado\tunel-$nombre.log"
  Remove-Item $log -ErrorAction SilentlyContinue
  $p = Start-Process $cloudflared -ArgumentList "tunnel --no-autoupdate --url http://localhost:$puerto" `
    -RedirectStandardError $log -WindowStyle Hidden -PassThru
  for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep -Seconds 1
    $m = Select-String -Path $log -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' -ErrorAction SilentlyContinue |
      Select-Object -First 1
    if ($m) { return @{ pid = $p.Id; url = $m.Matches[0].Value } }
  }
  Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
  throw "No se pudo abrir el tunel de $nombre. Mira $log"
}
$tienda = Abrir-Tunel 3100 'tienda'
$correo = Abrir-Tunel 8026 'mails'
$procesos += $tienda.pid, $correo.pid
function Guardar {
  @{ procesos = $script:procesos; tienda = $tienda.url; mails = $correo.url } | ConvertTo-Json |
    Set-Content -Encoding utf8 "$estado\procesos.json"
}
Guardar

# 3. Variables de la API: las de desarrollo, apuntadas a la demo
$valores = [ordered]@{
  NODE_ENV       = 'development'
  PORT           = '4100'
  DATABASE_URL   = 'postgres://casa:casa@localhost:5433/casa_demo'
  API_PUBLIC_URL = $tienda.url
  FRONTEND_URL   = $tienda.url
  REVALIDATE_URL = 'http://localhost:3100'
  # Panel sin enlace por mail mientras dure la demo. Para volver al enlace, borrar esta linea y
  # la de $env:DEMO_INGRESO_DIRECTO mas abajo.
  DEMO_INGRESO_DIRECTO = $ADMIN
  SMTP_DEV_HOST  = 'localhost'
  SMTP_DEV_PORT  = '1026'
  MAIL_ADMIN     = $ADMIN
  MP_ACCESS_TOKEN = ''
  RESEND_API_KEY = ''
  SENTRY_DSN     = ''
}
$lineas = Get-Content "$raiz\backend\.env" | ForEach-Object {
  $clave = ($_ -split '=', 2)[0].Trim()
  if ($valores.Contains($clave)) { "$clave=$($valores[$clave])"; $valores.Remove($clave) } else { $_ }
}
$lineas += $valores.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" }
$lineas | Set-Content -Encoding utf8 "$raiz\backend\.env.demo"
$secreto = (($lineas | Where-Object { $_ -like 'REVALIDATE_SECRET=*' }) -split '=', 2)[1]

# 4. API y worker de mails
Write-Host '3/5 Iniciando la API y el envio de mails...'
function Iniciar([string]$carpeta, [string]$argumentos, [string]$nombre) {
  $p = Start-Process node -ArgumentList $argumentos -WorkingDirectory "$raiz\$carpeta" `
    -RedirectStandardOutput "$estado\$nombre.log" -RedirectStandardError "$estado\$nombre.err.log" `
    -WindowStyle Hidden -PassThru
  return $p.Id
}
$procesos += Iniciar 'backend' 'node_modules/tsx/dist/cli.mjs --env-file=.env.demo src/main.ts' 'api'
$procesos += Iniciar 'backend' 'node_modules/tsx/dist/cli.mjs --env-file=.env.demo src/worker/main.ts' 'worker'
Guardar

function Esperar([string]$url, [string]$nombre) {
  for ($i = 0; $i -lt 90; $i++) {
    try { Invoke-WebRequest $url -UseBasicParsing -TimeoutSec 3 | Out-Null; return } catch {
      if ($_.Exception.Response) { return }
    }
    Start-Sleep -Seconds 1
  }
  throw "La $nombre no respondio. Mira los .log en $estado"
}
Esperar 'http://localhost:4100/api/v1/salud' 'API'

# 5. Frontend compilado (mas rapido que el modo desarrollo), en .next-demo
$env:API_INTERNAL_URL = 'http://localhost:4100'
$env:NEXT_DIST_DIR = '.next-demo'
$env:REVALIDATE_SECRET = $secreto
$env:NEXT_TELEMETRY_DISABLED = '1'
# Accesos de la demo: la tienda muestra "Panel" y el panel, la bandeja de mails (frontend/src/lib/demo.ts).
$env:DEMO = '1'
$env:DEMO_URL_MAILS = $correo.url
$env:DEMO_EMAIL_ADMIN = $ADMIN
$env:DEMO_INGRESO_DIRECTO = '1'
# Se recompila si hay codigo del frontend o de shared mas nuevo que la ultima compilacion.
$compilado = Get-Item "$raiz\frontend\.next-demo\BUILD_ID" -ErrorAction SilentlyContinue
$cambios = $compilado -and (Get-ChildItem "$raiz\frontend\src", "$raiz\shared\src", "$raiz\frontend\next.config.ts" -Recurse -File |
  Where-Object { $_.LastWriteTime -gt $compilado.LastWriteTime } | Select-Object -First 1)
if ($Compilar -or -not $compilado -or $cambios) {
  Write-Host '4/5 Compilando el frontend (tarda unos minutos)...'
  Push-Location "$raiz\frontend"
  node node_modules/next/dist/bin/next build
  $ok = $LASTEXITCODE -eq 0
  Pop-Location
  if (-not $ok) { throw 'Fallo la compilacion del frontend' }
} else {
  Write-Host '4/5 Frontend ya compilado y sin cambios'
}
Write-Host '5/5 Iniciando la tienda...'
$procesos += Iniciar 'frontend' 'node_modules/next/dist/bin/next start -p 3100' 'tienda'
Guardar
Esperar 'http://localhost:3100/' 'tienda'

Write-Host ''
Write-Host 'Demo lista. Para pasarle al cliente:' -ForegroundColor Green
Write-Host "  Tienda:  $($tienda.url)"
Write-Host "  Panel:   $($tienda.url)/panel   (ingresar con $ADMIN)"
Write-Host "  Mails:   $($correo.url)"
Write-Host ''
Write-Host 'El enlace para entrar al panel llega a la bandeja de Mails. Para apagar: .\infra\demo\detener-demo.ps1'
