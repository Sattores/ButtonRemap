# USB Button Configurator

## Overview
A Windows 11 desktop application using Tauri that intercepts input from physical USB buttons and allows users to remap them to execute applications, scripts, or system commands. Features a modern Glassmorphism aesthetic with professional design.

## Current State
- **Mode**: Full-stack development (Tauri-ready)
- **Frontend**: Complete React UI with mock data support
- **Backend**: Rust scaffold in `src-tauri/` with HID manager, config persistence, and IPC commands
- **Status**: Ready for local Tauri build on Windows

## Architecture

### Frontend (client/)
- React + TypeScript + Vite
- shadcn/ui components with Glassmorphism styling
- `TauriBridge` abstraction layer for IPC
- Fonts: Plus Jakarta Sans (UI) + JetBrains Mono (technical)

### Backend (src-tauri/)
- Rust with Tauri 2.0
- `hidapi` for USB HID device access
- JSON-based config persistence
- Commands: list_devices, save_binding, test_action, etc.

### Shared Types (shared/)
- `types.ts` - TypeScript interfaces
- `ipc.ts` - IPC command/event names
- `presets.ts` - AI/Voice and productivity action presets

## Key Files
| File | Purpose |
|------|---------|
| `client/src/pages/dashboard.tsx` | Main UI |
| `client/src/lib/tauri-bridge.ts` | IPC abstraction |
| `shared/types.ts` | Data models |
| `src-tauri/src/main.rs` | Rust entry point |
| `src-tauri/src/hid.rs` | USB HID manager |
| `src-tauri/src/commands.rs` | IPC handlers |

## User Preferences
- Priority presets: AI/Voice actions (Whisper, LLM clipboard, ChatGPT voice, mic mute)
- Design: Glassmorphism with subtle gradients
- App icon: Flat circular USB symbol

## Build Instructions
See `BUILD_INSTRUCTIONS.md` for complete Windows build guide.

Quick start:
```powershell
.\setup-tauri.ps1   # Windows
./setup-tauri.sh    # Linux/Mac
```

## Recent Changes
- 2024-11: Moved src-tauri to project root for standard Tauri structure
- 2024-11: Created setup scripts (PowerShell and Bash)
- 2024-11: Updated BUILD_INSTRUCTIONS.md with complete workflow
- 2024: Created Tauri project scaffold with full Rust backend stubs
- 2024: Updated TauriBridge to avoid dynamic imports in development
- 2024: Dashboard now uses TauriBridge for all operations
- 2024: Added preset categories with AI/Voice focus
