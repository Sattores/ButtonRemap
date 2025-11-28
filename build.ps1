# USB Configurator - Build Script
# Запустите: .\build.ps1

param(
    [switch]$Dev,      # Режим разработки
    [switch]$Release,  # Сборка релиза (по умолчанию)
    [switch]$Clean     # Очистить перед сборкой
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     USB Configurator - Build Script      ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Проверка наличия необходимых инструментов
function Test-Prerequisites {
    Write-Host "[1/5] Проверка инструментов..." -ForegroundColor Yellow
    
    # Node.js
    if (!(Get-Command node -ErrorAction SilentlyContinue)) {
        Write-Host "  ✗ Node.js не найден!" -ForegroundColor Red
        Write-Host "    Установите: https://nodejs.org/" -ForegroundColor Gray
        exit 1
    }
    $nodeVer = node --version
    Write-Host "  ✓ Node.js $nodeVer" -ForegroundColor Green
    
    # Rust
    if (!(Get-Command rustc -ErrorAction SilentlyContinue)) {
        Write-Host "  ✗ Rust не найден!" -ForegroundColor Red
        Write-Host "    Установите: https://rustup.rs/" -ForegroundColor Gray
        exit 1
    }
    $rustVer = rustc --version
    Write-Host "  ✓ $rustVer" -ForegroundColor Green
    
    # Cargo
    if (!(Get-Command cargo -ErrorAction SilentlyContinue)) {
        Write-Host "  ✗ Cargo не найден!" -ForegroundColor Red
        exit 1
    }
    Write-Host "  ✓ Cargo доступен" -ForegroundColor Green
}

# Настройка конфигурации
function Set-TauriConfig {
    Write-Host "[2/5] Настройка конфигурации..." -ForegroundColor Yellow
    
    if (Test-Path "package.tauri.json") {
        Copy-Item "package.tauri.json" "package.json" -Force
        Write-Host "  ✓ package.json обновлён" -ForegroundColor Green
    }
    
    if (Test-Path "vite.config.tauri.ts") {
        Copy-Item "vite.config.tauri.ts" "vite.config.ts" -Force
        Write-Host "  ✓ vite.config.ts обновлён" -ForegroundColor Green
    }
}

# Установка зависимостей
function Install-Dependencies {
    Write-Host "[3/5] Установка зависимостей..." -ForegroundColor Yellow
    
    # npm
    if (!(Test-Path "node_modules")) {
        Write-Host "  → Установка npm пакетов..." -ForegroundColor Gray
        npm install --silent
    }
    Write-Host "  ✓ npm зависимости готовы" -ForegroundColor Green
    
    # Cargo (в фоне)
    Push-Location src-tauri
    if (!(Test-Path "target")) {
        Write-Host "  → Загрузка Rust зависимостей..." -ForegroundColor Gray
        cargo fetch --quiet
    }
    Write-Host "  ✓ Cargo зависимости готовы" -ForegroundColor Green
    Pop-Location
}

# Очистка предыдущей сборки
function Clear-Build {
    Write-Host "[*] Очистка предыдущей сборки..." -ForegroundColor Yellow
    
    if (Test-Path "dist") {
        Remove-Item -Recurse -Force "dist"
        Write-Host "  ✓ Удалена папка dist" -ForegroundColor Green
    }
    
    Push-Location src-tauri
    if (Test-Path "target/release") {
        cargo clean --release --quiet
        Write-Host "  ✓ Очищена Rust сборка" -ForegroundColor Green
    }
    Pop-Location
}

# Сборка приложения
function Build-App {
    param([bool]$IsRelease)
    
    if ($IsRelease) {
        Write-Host "[4/5] Сборка релизной версии..." -ForegroundColor Yellow
        npm run tauri:build
    } else {
        Write-Host "[4/5] Запуск в режиме разработки..." -ForegroundColor Yellow
        npm run tauri:dev
        return
    }
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ✗ Ошибка сборки!" -ForegroundColor Red
        exit 1
    }
    Write-Host "  ✓ Сборка завершена" -ForegroundColor Green
}

# Показать результат
function Show-Result {
    Write-Host "[5/5] Готово!" -ForegroundColor Yellow
    Write-Host ""
    
    $bundlePath = "src-tauri\target\release\bundle"
    
    if (Test-Path "$bundlePath\msi") {
        $msi = Get-ChildItem "$bundlePath\msi\*.msi" | Select-Object -First 1
        if ($msi) {
            Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor Green
            Write-Host "║            СБОРКА ЗАВЕРШЕНА!             ║" -ForegroundColor Green
            Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Green
            Write-Host ""
            Write-Host "  Установщик MSI:" -ForegroundColor White
            Write-Host "  $($msi.FullName)" -ForegroundColor Cyan
            Write-Host ""
            
            $exePath = "src-tauri\target\release\usb-configurator.exe"
            if (Test-Path $exePath) {
                Write-Host "  Portable EXE:" -ForegroundColor White
                Write-Host "  $(Resolve-Path $exePath)" -ForegroundColor Cyan
            }
            
            Write-Host ""
            Write-Host "  Размер: $([math]::Round($msi.Length / 1MB, 2)) MB" -ForegroundColor Gray
            Write-Host ""
            
            # Открыть папку с результатом
            explorer.exe (Split-Path $msi.FullName)
        }
    }
    
    if (Test-Path "$bundlePath\nsis") {
        $nsis = Get-ChildItem "$bundlePath\nsis\*.exe" | Select-Object -First 1
        if ($nsis) {
            Write-Host "  NSIS Установщик:" -ForegroundColor White
            Write-Host "  $($nsis.FullName)" -ForegroundColor Cyan
            Write-Host ""
        }
    }
}

# Основной процесс
Test-Prerequisites

if ($Clean) {
    Clear-Build
}

Set-TauriConfig
Install-Dependencies

if ($Dev) {
    Build-App -IsRelease $false
} else {
    Build-App -IsRelease $true
    Show-Result
}
