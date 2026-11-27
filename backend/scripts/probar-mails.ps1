# Recorre el ciclo de mails contra la API local y deja todo en Mailpit para revisarlo.
# Necesita levantados: Docker (base y Mailpit), la API (pnpm --filter backend dev) y el worker
# (pnpm --filter backend run worker:dev).
#
# Uso, desde la carpeta del proyecto:
#   powershell -File backend\scripts\probar-mails.ps1
#   powershell -File backend\scripts\probar-mails.ps1 -Limpiar      # vacía Mailpit antes
param(
  [string]$Api = 'http://localhost:4000/api/v1',
  [string]$Mailpit = 'http://localhost:8025',
  [string]$Admin = 'admin@example.com',
  [string]$Comprador = 'yo@prueba.test',
  [switch]$Limpiar
)
$ErrorActionPreference = 'Stop'
$json = 'application/json; charset=utf-8'

function Paso($texto) { Write-Host "`n> $texto" -ForegroundColor Cyan }

function Ingresar {
  Invoke-RestMethod -Method Post "$Api/auth/enlace" -ContentType $json -Body (@{ email = $Admin } | ConvertTo-Json) | Out-Null
  # El worker revisa la cola cada 10 segundos.
  for ($i = 0; $i -lt 10; $i++) {
    Start-Sleep -Seconds 3
    $lista = Invoke-RestMethod "$Mailpit/api/v1/search?query=subject:enlace"
    if ($lista.messages_count -gt 0) { break }
  }
  if ($lista.messages_count -eq 0) { throw 'No llegó el enlace de ingreso: ¿está corriendo el worker?' }
  $mail = Invoke-RestMethod "$Mailpit/api/v1/message/$($lista.messages[0].ID)"
  $enlace = [regex]::Match($mail.Text, 'http\S*verificar\?token=\S+').Value
  # El enlace redirige al frontend (que todavía no existe); alcanza con guardar la cookie.
  try { Invoke-WebRequest $enlace -SessionVariable s -MaximumRedirection 0 -UseBasicParsing -ErrorAction Stop | Out-Null } catch {}
  if ($s.Cookies.Count -eq 0) { throw 'No se pudo iniciar la sesión de admin' }
  return $s
}

function Pedido($entrega, $medio, $zona) {
  $cuerpo = @{
    items     = @(@{ productoId = $script:producto; cantidad = 1 })
    entrega   = $entrega
    medioPago = $medio
    comprador = @{ nombre = 'Prueba Manual'; dni = '30123456'; telefono = '223 512 3456'; email = $Comprador }
  }
  if ($entrega -eq 'colocacion') {
    $cuerpo.zonaId = $zona
    $cuerpo.comprador.calle = 'Colón'
    $cuerpo.comprador.numero = '1234'
  }
  $p = Invoke-RestMethod -Method Post "$Api/pedidos" -ContentType $json -Body ($cuerpo | ConvertTo-Json -Depth 5)
  Write-Host "  pedido #$($p.numero) ($entrega, $medio)"
  return $p
}

function Accion($pedido, $ruta, $cuerpo = @{}) {
  Invoke-RestMethod -Method Post "$Api/admin/pedidos/$($pedido.id)/$ruta" -WebSession $script:sesion -ContentType $json -Body ($cuerpo | ConvertTo-Json) | Out-Null
}

if ($Limpiar) { Invoke-RestMethod -Method Delete "$Mailpit/api/v1/messages" | Out-Null }

Paso 'Ingreso al panel con el enlace por mail'
$sesion = Ingresar
$activos = (Invoke-RestMethod "$Api/admin/productos?estado=activo" -WebSession $sesion).items | Where-Object { $_.stock -ge 3 }
if (-not $activos) { throw 'No hay productos activos con stock: activá uno desde el panel o subile el stock' }
$producto = $activos[0].id
$zona = (Invoke-RestMethod "$Api/configuracion/publica").zonas[0].id
Write-Host "  producto: $($activos[0].nombre)"
$antes = (Invoke-RestMethod "$Mailpit/api/v1/messages").total

Paso 'Retiro en el local: recibido -> pago confirmado -> lista para retirar -> entregado'
$retiro = Pedido 'retiro' 'transferencia'
Accion $retiro 'confirmar-transferencia'
Accion $retiro 'estado' @{ a = 'listo_para_retirar' }
Accion $retiro 'estado' @{ a = 'entregado' }

Paso 'Colocación a domicilio: recibido -> pago confirmado -> vamos en camino'
$colocacion = Pedido 'colocacion' 'transferencia' $zona
Accion $colocacion 'confirmar-transferencia'
Accion $colocacion 'estado' @{ a = 'en_camino' }

Paso 'Efectivo en el local: recibido -> cancelado'
$cancelado = Pedido 'retiro' 'efectivo'
Accion $cancelado 'estado' @{ a = 'cancelado'; motivo = 'Prueba de cancelación' }

Paso 'Consulta de canje: aviso al admin'
Invoke-RestMethod -Method Post "$Api/consultas-canje" -ContentType $json -Body (@{ nombre = 'Juan Prueba'; telefono = '223 400 1122'; auto = 'Gol Trend'; localidad = 'Mar del Plata' } | ConvertTo-Json) | Out-Null

Paso 'Esperando que el worker mande los mails (sale de a tandas cada 10 segundos)...'
# 15 mails: 6 del pedido de retiro, 5 del de colocación, 3 del cancelado y 1 del canje.
$esperados = $antes + 15
for ($i = 0; $i -lt 20; $i++) {
  $total = (Invoke-RestMethod "$Mailpit/api/v1/messages").total
  if ($total -ge $esperados) { break }
  Start-Sleep -Seconds 3
}
$dni = (Invoke-RestMethod "$Mailpit/api/v1/search?query=30123456").messages_count
Write-Host "  mails nuevos en Mailpit: $($total - $antes) de 15"
if ($dni -eq 0) { Write-Host '  el DNI no aparece en ningún mail: OK' -ForegroundColor Green }
else { Write-Host "  ATENCIÓN: el DNI aparece en $dni mails" -ForegroundColor Red }

Start-Process $Mailpit
