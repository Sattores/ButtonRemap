@echo off
chcp 65001 >nul
title USB Configurator - Сборка

echo.
echo ╔══════════════════════════════════════════╗
echo ║     USB Configurator - Build Script      ║
echo ╚══════════════════════════════════════════╝
echo.

cd /d "D:\MyProjects\ButtonRemap"

echo [1/5] Проверка инструментов...

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo   X Node.js не найден!
    echo   Установите: https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do echo   √ Node.js %%i

where rustc >nul 2>&1
if %errorlevel% neq 0 (
    echo   X Rust не найден!
    echo   Установите: https://rustup.rs/
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('rustc --version') do echo   √ %%i

echo.
echo [2/5] Настройка конфигурации...

if exist "package.tauri.json" (
    copy /y "package.tauri.json" "package.json" >nul
    echo   √ package.json обновлён
)

if exist "vite.config.tauri.ts" (
    copy /y "vite.config.tauri.ts" "vite.config.ts" >nul
    echo   √ vite.config.ts обновлён
)

echo.
echo [3/5] Установка зависимостей...

if not exist "node_modules" (
    echo   - Установка npm пакетов...
    call npm install
)
echo   √ npm зависимости готовы

echo.
echo [4/5] Сборка приложения...
echo   Это может занять несколько минут...
echo.

call npm run tauri:build

if %errorlevel% neq 0 (
    echo.
    echo   X Ошибка сборки!
    pause
    exit /b 1
)

echo.
echo [5/5] Готово!
echo.
echo ╔══════════════════════════════════════════╗
echo ║            СБОРКА ЗАВЕРШЕНА!             ║
echo ╚══════════════════════════════════════════╝
echo.
echo   Файлы находятся в:
echo   src-tauri\target\release\bundle\
echo.

:: Открыть папку с результатом
if exist "src-tauri\target\release\bundle\msi" (
    explorer "src-tauri\target\release\bundle\msi"
)

pause
