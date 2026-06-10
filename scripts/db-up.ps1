# Starts the dev postgres container via WSL docker.
# WSL idle-terminates the distro (and dockerd) shortly after the last wsl
# session exits, so a hidden keepalive process holds it open.
$keepalive = Get-CimInstance Win32_Process -Filter "Name = 'wsl.exe'" |
  Where-Object { $_.CommandLine -match 'domar-wsl-keepalive' }
if (-not $keepalive) {
  Start-Process -WindowStyle Hidden wsl.exe -ArgumentList @(
    '-d', 'Ubuntu', '--', 'bash', '-c', 'exec -a domar-wsl-keepalive sleep infinity'
  )
  Write-Host "Started WSL keepalive."
}

wsl -d Ubuntu docker compose -f docker-compose.dev.yml up -d
