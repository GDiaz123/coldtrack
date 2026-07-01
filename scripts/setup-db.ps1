# Script de configuración de base de datos — Windows
# Uso: .\scripts\setup-db.ps1

Write-Host "=== COLDTRACK — Configuración de PostgreSQL ===" -ForegroundColor Cyan

# Verificar Docker
try {
    docker --version | Out-Null
} catch {
    Write-Host ""
    Write-Host "ERROR: Docker no está instalado." -ForegroundColor Red
    Write-Host "Instale Docker Desktop desde: https://www.docker.com/products/docker-desktop/" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Mientras tanto, puede usar modo demo sin base de datos:" -ForegroundColor Yellow
    Write-Host "  1. Comente DATABASE_URL en .env" -ForegroundColor White
    Write-Host "  2. Ejecute: npm run dev" -ForegroundColor White
    Write-Host "  3. Login con admin@coldtrack.ai / password123" -ForegroundColor White
    exit 1
}

Write-Host "Docker detectado. Levantando PostgreSQL..." -ForegroundColor Green
docker compose up db -d

Write-Host "Esperando que PostgreSQL esté listo..." -ForegroundColor Yellow
Start-Sleep -Seconds 8

$status = docker compose ps --format json 2>$null | ConvertFrom-Json
$dbRunning = $status | Where-Object { $_.Service -eq "db" -and $_.State -match "running" }

if (-not $dbRunning) {
    Write-Host "ERROR: PostgreSQL no inició correctamente." -ForegroundColor Red
    Write-Host "Ejecute: docker compose logs db" -ForegroundColor Yellow
    exit 1
}

Write-Host "PostgreSQL corriendo. Aplicando esquema..." -ForegroundColor Green
npm run db:push

Write-Host "Insertando datos demo..." -ForegroundColor Green
npm run db:seed

Write-Host ""
Write-Host "=== Base de datos lista ===" -ForegroundColor Green
Write-Host ""
Write-Host "Asegúrese de tener DATABASE_URL descomentada en .env:" -ForegroundColor Yellow
Write-Host '  DATABASE_URL="postgresql://coldtrack:coldtrack_secret@localhost:5432/coldtrack"' -ForegroundColor White
Write-Host ""
Write-Host "Inicie la app con: npm run dev" -ForegroundColor Cyan
Write-Host "Login demo: admin@coldtrack.ai / password123" -ForegroundColor Cyan
Write-Host "Registro: http://localhost:3000/register" -ForegroundColor Cyan
