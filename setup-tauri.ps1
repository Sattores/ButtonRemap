# USB Configurator - Tauri Setup Script for Windows
# Run this script in PowerShell after cloning/downloading the project

Write-Host "=== USB Configurator - Tauri Setup ===" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js not found. Install from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Check Rust
try {
    $rustVersion = rustc --version
    Write-Host "✓ Rust: $rustVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Rust not found. Install from https://rustup.rs/" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Setting up project structure..." -ForegroundColor Yellow

# Step 1: Replace package.json with Tauri version
if (Test-Path "package.tauri.json") {
    Copy-Item "package.tauri.json" "package.json" -Force
    Write-Host "✓ Updated package.json for Tauri" -ForegroundColor Green
}

# Step 2: Replace vite.config.ts with Tauri version
if (Test-Path "vite.config.tauri.ts") {
    Copy-Item "vite.config.tauri.ts" "vite.config.ts" -Force
    Write-Host "✓ Updated vite.config.ts for Tauri" -ForegroundColor Green
}

# Step 3: Install npm dependencies
Write-Host ""
Write-Host "Installing npm dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ npm dependencies installed" -ForegroundColor Green
} else {
    Write-Host "✗ npm install failed" -ForegroundColor Red
    exit 1
}

# Step 4: Build Rust dependencies
Write-Host ""
Write-Host "Building Rust dependencies (this may take a few minutes)..." -ForegroundColor Yellow
Push-Location src-tauri
cargo build
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Rust dependencies built" -ForegroundColor Green
} else {
    Write-Host "✗ cargo build failed" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location

# Done!
Write-Host ""
Write-Host "=== Setup Complete! ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Available commands:" -ForegroundColor White
Write-Host "  npm run tauri:dev   - Start development mode" -ForegroundColor Gray
Write-Host "  npm run tauri:build - Build for production" -ForegroundColor Gray
Write-Host ""
Write-Host "Output files will be in: src-tauri/target/release/bundle/" -ForegroundColor Gray
Write-Host ""
