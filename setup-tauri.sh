#!/bin/bash
# USB Configurator - Tauri Setup Script for Linux/Mac
# Run: chmod +x setup-tauri.sh && ./setup-tauri.sh

echo "=== USB Configurator - Tauri Setup ==="
echo ""

# Check prerequisites
echo "Checking prerequisites..."

# Check Node.js
if command -v node &> /dev/null; then
    echo "✓ Node.js: $(node --version)"
else
    echo "✗ Node.js not found. Install from https://nodejs.org/"
    exit 1
fi

# Check Rust
if command -v rustc &> /dev/null; then
    echo "✓ Rust: $(rustc --version)"
else
    echo "✗ Rust not found. Install from https://rustup.rs/"
    exit 1
fi

echo ""
echo "Setting up project structure..."

# Step 1: Replace package.json with Tauri version
if [ -f "package.tauri.json" ]; then
    cp package.tauri.json package.json
    echo "✓ Updated package.json for Tauri"
fi

# Step 2: Replace vite.config.ts with Tauri version  
if [ -f "vite.config.tauri.ts" ]; then
    cp vite.config.tauri.ts vite.config.ts
    echo "✓ Updated vite.config.ts for Tauri"
fi

# Step 3: Install npm dependencies
echo ""
echo "Installing npm dependencies..."
npm install
if [ $? -eq 0 ]; then
    echo "✓ npm dependencies installed"
else
    echo "✗ npm install failed"
    exit 1
fi

# Step 4: Build Rust dependencies
echo ""
echo "Building Rust dependencies (this may take a few minutes)..."
cd src-tauri
cargo build
if [ $? -eq 0 ]; then
    echo "✓ Rust dependencies built"
else
    echo "✗ cargo build failed"
    cd ..
    exit 1
fi
cd ..

# Done!
echo ""
echo "=== Setup Complete! ==="
echo ""
echo "Available commands:"
echo "  npm run tauri:dev   - Start development mode"
echo "  npm run tauri:build - Build for production"
echo ""
echo "Output files will be in: src-tauri/target/release/bundle/"
echo ""
