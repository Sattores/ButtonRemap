# USB Configurator - Build Instructions

## Quick Start (Windows)

### Prerequisites
1. **Node.js 20+** — [nodejs.org](https://nodejs.org/)
2. **Rust** — [rustup.rs](https://rustup.rs/)
3. **Build Tools for Visual Studio 2022** — [visualstudio.microsoft.com](https://visualstudio.microsoft.com/downloads/)
   - Select "Desktop development with C++"

### One-Command Setup

```powershell
# Clone the repository
git clone https://github.com/YOUR_USERNAME/usb-configurator.git
cd usb-configurator

# Run the setup script
.\setup-tauri.ps1
```

Or manually:

```powershell
# 1. Replace config files with Tauri versions
Copy-Item package.tauri.json package.json -Force
Copy-Item vite.config.tauri.ts vite.config.ts -Force

# 2. Install dependencies
npm install

# 3. Build Rust backend
cd src-tauri
cargo build
cd ..

# 4. Run in development mode
npm run tauri:dev

# 5. Build for production
npm run tauri:build
```

---

## Project Structure

```
usb-configurator/
├── client/                 # React frontend
│   ├── src/
│   │   ├── pages/          # Dashboard UI
│   │   ├── components/     # shadcn/ui components
│   │   ├── lib/            # TauriBridge IPC layer
│   │   └── hooks/          # React hooks
│   └── index.html
├── shared/                 # Shared TypeScript types
│   ├── types.ts            # Data models
│   ├── ipc.ts              # IPC command names
│   └── presets.ts          # Action presets
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── main.rs         # Entry point
│   │   ├── commands.rs     # IPC handlers
│   │   ├── hid.rs          # USB HID manager
│   │   ├── config.rs       # Config persistence
│   │   └── types.rs        # Rust types
│   ├── Cargo.toml          # Rust dependencies
│   └── tauri.conf.json     # Tauri config
├── package.tauri.json      # Package.json for Tauri build
├── vite.config.tauri.ts    # Vite config for Tauri
├── setup-tauri.ps1         # Windows setup script
└── setup-tauri.sh          # Linux/Mac setup script
```

---

## Build Output

After running `npm run tauri:build`:

```
src-tauri/target/release/
├── usb-configurator.exe           # Standalone executable
└── bundle/
    ├── msi/
    │   └── USB Configurator_2.1.0_x64.msi
    └── nsis/
        └── USB Configurator_2.1.0_x64-setup.exe
```

---

## Development Workflow

### Development Mode
```powershell
npm run tauri:dev
```
- Hot-reload for frontend changes
- Rust recompiles on backend changes
- DevTools available (F12)

### Production Build
```powershell
npm run tauri:build
```
- Optimized frontend bundle
- Release Rust binary
- Windows installer (.msi)

---

## Configuration Files

### package.tauri.json → package.json
Contains Tauri-specific scripts and cleaned dependencies (no server-side packages).

### vite.config.tauri.ts → vite.config.ts
Vite configuration optimized for Tauri:
- Correct paths for client/dist
- Port 5000 for Tauri dev server
- Environment variable prefixes

### src-tauri/tauri.conf.json
Tauri application configuration:
- Window size and title
- Build commands
- Bundle settings
- App icons

---

## Troubleshooting

### "hidapi" Compilation Fails
```powershell
winget install LLVM.LLVM
```

### WebView2 Not Found
Download from [Microsoft WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)

### Rust Build Errors
```powershell
rustup update
cd src-tauri
cargo clean
cargo build
```

### Port 5000 Already in Use
Edit `vite.config.ts` and `src-tauri/tauri.conf.json` to use a different port.

---

## App Icons

Place your icons in `src-tauri/icons/`:
- `32x32.png`
- `128x128.png`
- `128x128@2x.png`
- `icon.ico` (Windows)
- `icon.icns` (Mac)

Generate from a single 1024x1024 image using:
```powershell
npm run tauri icon path/to/icon.png
```
