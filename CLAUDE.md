# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

USB Configurator (ButtonRemap) is a Tauri-based desktop application that allows users to map USB HID buttons to system actions (launch apps, run scripts, hotkeys, etc.). The application uses a React frontend with TypeScript and a Rust backend for USB device access.

## Build and Development Commands

### Development
```bash
npm run tauri:dev
```
Runs the application in development mode with hot-reload for frontend changes and automatic Rust recompilation.

### Production Build
```bash
npm run tauri:build
# or use the build script:
build.bat
```
Creates optimized bundles in `src-tauri/target/release/bundle/` (MSI installer and executable).

### Type Checking
```bash
npm run check
```
Runs TypeScript type checker without emitting files.

### Frontend Only
```bash
npm run dev         # Development server on port 5000
npm run build       # Build frontend to dist/
```

### Rust Backend Only
```bash
cd src-tauri
cargo build         # Debug build
cargo build --release  # Release build
```

## Architecture

### Project Structure
- **`client/`** - React frontend (Vite + TypeScript + shadcn/ui)
  - `src/pages/` - UI pages (dashboard, configuration states)
  - `src/components/ui/` - shadcn/ui component library
  - `src/lib/tauri-bridge.ts` - IPC abstraction layer (works in dev without Tauri)
  - `src/hooks/` - React hooks
- **`shared/`** - Shared TypeScript types and constants
  - `types.ts` - Data models mirrored in Rust
  - `ipc.ts` - IPC command/event names contract
  - `schema.ts` - Zod validation schemas
  - `presets.ts` - Action presets
- **`src-tauri/`** - Rust backend (Tauri + hidapi)
  - `src/main.rs` - App entry point, registers IPC handlers
  - `src/commands.rs` - Tauri command handlers (IPC layer)
  - `src/hid.rs` - USB HID device manager (hidapi wrapper)
  - `src/config.rs` - JSON persistence for bindings/settings
  - `src/types.rs` - Rust structs matching `shared/types.ts`

### IPC Communication Pattern

**Frontend → Backend (Commands):**
- Frontend calls `TauriBridge.listDevices()` → Tauri invokes `list_devices` command
- All commands return `IpcResult<T>` with success/error handling

**Backend → Frontend (Events):**
- Backend emits Tauri events like `device-detected`, `button-pressed`
- Frontend listens via `TauriBridge.on(event, callback)`

**Development Mode:**
- `tauri-bridge.ts` detects if Tauri is available
- Falls back to mock data in browser-only development
- All IPC commands work identically in both modes

### Type System

Types are defined once in `shared/types.ts` and mirrored in `src-tauri/src/types.rs`:
- `HidDevice` - USB device metadata (VID/PID, status, name)
- `DeviceBinding` - Maps device to action configuration
- `ActionConfig` - Action to execute (launch-app, run-script, system-command, hotkey)
- `IpcResult<T>` - Standard response wrapper for all IPC commands

When adding new types:
1. Define in `shared/types.ts`
2. Mirror in `src-tauri/src/types.rs` with matching `#[derive(Serialize, Deserialize)]`
3. Update both if making changes

### State Management

**Rust (Backend):**
- `AppState` struct holds `Mutex<ConfigManager>` and `Mutex<HidManager>`
- Managed state injected into Tauri commands via `State<'_, AppState>`
- Config persisted to JSON files in user config directory (`~/.config/usb-configurator/`)

**React (Frontend):**
- TanStack Query (`@tanstack/react-query`) for server state
- Local state via React hooks for UI interactions
- Query keys defined in component files

### USB Device Detection Flow

1. User clicks "Find Button" → `startMonitoring()` IPC command
2. Rust spawns monitoring thread polling HID devices for input
3. On input detected → emits `monitoring-detected` event with device info
4. Frontend receives event → displays detected device in UI
5. User configures binding → `saveBinding()` IPC command
6. Rust saves to JSON + marks device as configured

## Important Patterns

### Path Aliases

TypeScript uses path aliases (configured in `tsconfig.json` and `vite.config.ts`):
- `@/` → `client/src/`
- `@shared/` → `shared/`
- `@assets/` → `attached_assets/`

Always use these aliases instead of relative imports when crossing directory boundaries.

### Component Structure

UI components use shadcn/ui library (Radix UI + Tailwind CSS):
- Components in `client/src/components/ui/` are auto-generated via shadcn CLI
- Customize by editing these files directly (they're meant to be modified)
- Use `class-variance-authority` (cva) for variant-based styling

### Error Handling

**Rust:**
- Custom error types using `thiserror` crate (see `HidError` in `hid.rs`)
- IPC commands return `IpcResult<T>` to gracefully handle errors
- Use `map_err(|e| e.to_string())` to convert errors to strings

**TypeScript:**
- All IPC calls check `result.success` before accessing `result.data`
- Display errors via `sonner` toast notifications

### Configuration Files

Two sets of config files exist for Tauri setup:
- `package.json` / `vite.config.ts` - Current Tauri configuration
- `package.tauri.json` / `vite.config.tauri.ts` - Alternative configurations

The build scripts (`build.bat`, `setup-tauri.ps1`) copy the `.tauri` versions when needed.

## Windows-Specific Notes

- The project uses Windows-specific build scripts (`build.bat`, `.ps1` files)
- HID access requires proper USB permissions
- Build requires Visual Studio Build Tools with "Desktop development with C++"
- Rust toolchain must be installed via rustup

## Testing Actions

Use the `test_action` IPC command to execute actions without saving bindings:
```typescript
await TauriBridge.testAction({
  type: "launch-app",
  executablePath: "C:\\path\\to\\app.exe",
  arguments: "--flag"
});
```

This is implemented in `src-tauri/src/commands.rs` and logs execution results.

## MCP Servers
Use these MCP servers:
- **github** - repos, PRs, issues
- **filesystem** - read/write files
- **memory** - save important decisions and context
- **sequential-thinking** - for tasks with >3 steps
- **context7** - library documentation search

## Rules

### Memory
- Save to memory: architecture decisions, bugs and fixes, user agreements
- Check memory for relevant context at session start

### Documentation
- Update CLAUDE.md when architecture changes
- Update README.md when adding new features
- Comment complex logic in code

### Git
- Atomic commits with clear messages
- Format: `feat:`, `fix:`, `refactor:`, `docs:`

### Code
- TypeScript: strict typing, no any
- Rust: handle all Result/Option
- Test changes before commit

### File Editing
- Use Serena MCP for code edits when available
- Never rewrite entire files - make surgical edits
- Always preserve existing functionality
- Show diff before committing

## Current Tasks
- [2024-11-29] Fixed "Find Button" feature - added real Tauri event listener to tauri-bridge.ts
- [2024-11-29] Full rebuild after cargo clean to apply all changes

## Known Issues
- [SOLVED 2024-11-29] Events from backend not reaching frontend - reason: tauri-bridge.ts used only mock event system. Fixed by adding `listen()` from `@tauri-apps/api/event`
