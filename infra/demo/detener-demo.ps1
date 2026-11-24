# Apaga la demo: solo los procesos que inicio iniciar-demo.ps1 (tuneles, API, worker y tienda)
# y el Mailpit de la demo. La base casa_demo queda guardada para la proxima vez.
$estado = Join-Path $PSScriptRoot '.estado'
$archivo = "$estado\procesos.json"
if (-not (Test-Path $archivo)) {
  Write-Host 'La demo no esta corriendo.'
  exit 0
}
$datos = Get-Content $archivo -Raw | ConvertFrom-Json
foreach ($id in $datos.procesos) {
  # Despues de reiniciar la PC el numero puede ser de otro programa: solo node y cloudflared.
  $p = Get-Process -Id $id -ErrorAction SilentlyContinue
  if (-not $p -or $p.ProcessName -notin 'node', 'cloudflared') { continue }
  # /T: tambien los procesos hijos (Next y tsx levantan otros node).
  taskkill /T /F /PID $id 2>$null | Out-Null
}
docker stop casa-demo-mailpit 2>$null | Out-Null
Remove-Item $archivo
Write-Host 'Demo apagada.'
