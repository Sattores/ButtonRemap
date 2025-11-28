# Build Instructions for Windows 11 (Tauri)

This project is designed to be compiled into a native Windows 11 application using **Tauri**. Tauri combines this React frontend with a lightweight Rust backend for high performance and native USB access.

## Overview

The project has two main parts:
1. **Frontend** - React + TypeScript + Vite (in `client/`)
2. **Backend** - Rust + Tauri (scaffold in `tauri-app/src-tauri/`)

In development mode (Replit), the app uses mock data. In production (Tauri build), it uses real USB HID device access.

## Prerequisites

### Required Software

1. **Node.js 20+** - [nodejs.org](https://nodejs.org/)
2. **Rust (stable)** - [rustup.rs](https://rustup.rs/)
3. **Build Tools for Visual Studio 2022/2026** - Required for Rust on Windows
   - Download from [Visual Studio Downloads](https://visualstudio.microsoft.com/downloads/)
   - Select "Desktop development with C++" workload
4. **WebView2** - Usually pre-installed on Windows 10/11

### Verify Installation

```powershell
node --version   # Should be 20.x or higher
npm --version    # Should be 10.x or higher
rustc --version  # Should be 1.70.0 or higher
cargo --version
```

## Build Steps

### Step 1: Clone and Setup

```bash
# Clone the repository (if not already done)
git clone <repository-url>
cd usb-configurator

# Install frontend dependencies
npm install
```

### Step 2: Initialize Tauri

The `tauri-app/` folder contains the pre-built Rust scaffold. Copy it to your project or use the structure as-is.

```bash
# Install Tauri CLI
npm install -D @tauri-apps/cli@latest

# Copy Tauri scaffold to project root (if not already structured)
cp -r tauri-app/* ./
```

### Step 3: Install Rust Dependencies

```bash
cd src-tauri
cargo build
cd ..
```

This will download and compile all Rust dependencies including:
- `hidapi` - USB HID device access
- `serde` - JSON serialization
- `tokio` - Async runtime
- `tauri` - Application framework

### Step 4: Development Mode

Run the Tauri development server (frontend + backend):

```bash
npm run tauri dev
```

This will:
- Start Vite dev server on port 5000
- Compile and launch the Rust backend
- Open the native window with dev tools

### Step 5: Build for Production

```bash
npm run tauri build
```

Output files will be in:
- `src-tauri/target/release/bundle/msi/` - Windows MSI installer
- `src-tauri/target/release/bundle/nsis/` - NSIS installer
- `src-tauri/target/release/usb-configurator.exe` - Standalone executable

## Project Structure

```
usb-configurator/
├── client/                 # React frontend
│   ├── src/
│   │   ├── pages/          # Dashboard and other pages
│   │   ├── components/     # UI components (shadcn/ui)
│   │   ├── lib/            # TauriBridge IPC layer
│   │   └── hooks/          # React hooks
│   └── index.html
├── shared/                 # Shared types (TS & Rust reference)
│   ├── types.ts            # TypeScript interfaces
│   ├── ipc.ts              # IPC command/event names
│   └── presets.ts          # Default action presets
├── src-tauri/              # Rust backend (from tauri-app/)
│   ├── src/
│   │   ├── main.rs         # Application entry point
│   │   ├── commands.rs     # Tauri IPC handlers
│   │   ├── hid.rs          # USB HID device manager
│   │   ├── config.rs       # Config persistence
│   │   └── types.rs        # Rust type definitions
│   ├── Cargo.toml          # Rust dependencies
│   └── tauri.conf.json     # Tauri configuration
├── package.json            # Node.js dependencies
└── BUILD_INSTRUCTIONS.md   # This file
```

## IPC Communication

The `TauriBridge` (in `client/src/lib/tauri-bridge.ts`) provides a unified API that:
- **Development**: Returns mock data for testing UI
- **Production**: Calls Rust backend via `window.__TAURI__.invoke()`

### Available Commands

| Command | Description |
|---------|-------------|
| `list_devices` | Get all connected USB HID devices |
| `refresh_devices` | Refresh device list |
| `start_monitoring` | Start "Find by Press" detection |
| `stop_monitoring` | Stop monitoring mode |
| `save_binding` | Save device → action mapping |
| `delete_binding` | Remove a binding |
| `test_action` | Execute an action for testing |
| `get_settings` | Get app settings |
| `save_settings` | Save app settings |

## Troubleshooting

### "hidapi" Compilation Fails

On Windows, you may need to install additional dependencies:

```powershell
# Install LLVM (required by some Rust crates)
winget install LLVM.LLVM
```

### WebView2 Not Found

If you get WebView2 errors, install it manually:
- Download from [Microsoft WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)

### USB Device Access Denied

The application needs to run with appropriate permissions to access USB HID devices. On first run, Windows may prompt for USB device access.

## Why Tauri?

| Feature | Tauri | Electron |
|---------|-------|----------|
| Bundle Size | ~5-10 MB | ~100+ MB |
| Memory Usage | ~20-50 MB | ~150+ MB |
| Startup Time | <1 second | 2-5 seconds |
| Security | Rust backend sandboxing | Full Node.js access |
| USB Access | Native via hidapi | Requires native modules |

## Next Steps

1. Add your app icons to `src-tauri/icons/`
2. Configure signing in `tauri.conf.json` for distribution
3. Set up auto-updates with Tauri's update plugin
4. Add Windows registry entries for "Start with Windows" feature
