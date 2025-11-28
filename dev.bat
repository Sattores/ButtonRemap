@echo off
chcp 65001 >nul
title USB Configurator - Dev Mode

cd /d "D:\MyProjects\ButtonRemap"

echo.
echo ╔══════════════════════════════════════════╗
echo ║     USB Configurator - Dev Mode          ║
echo ╚══════════════════════════════════════════╝
echo.

if exist "package.tauri.json" (
    copy /y "package.tauri.json" "package.json" >nul
)
if exist "vite.config.tauri.ts" (
    copy /y "vite.config.tauri.ts" "vite.config.ts" >nul
)

if not exist "node_modules" (
    echo Установка зависимостей...
    call npm install
)

echo Запуск в режиме разработки...
echo (Ctrl+C для остановки)
echo.

call npm run tauri:dev
