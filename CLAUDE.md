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

### Before Testing (CRITICAL)
**ALWAYS close old app instances before starting the dev server:**
```bash
cmd /c "taskkill /F /IM usb-configurator.exe 2>nul & taskkill /F /IM node.exe 2>nul & echo Done"
```
This prevents port conflicts and stale process issues.

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
- **serena** - semantic code analysis and refactoring

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

### Edit Workflow (CRITICAL)
1. **NEVER rewrite entire files** - Only surgical edits
2. **Before ANY file edit:**
   - `git stash` (save current work)
   - `git status` (check state)
3. **After EACH small change that works:**
   - `git add -A && git commit -m "description"`
4. **Use Serena MCP for code edits when possible**
5. **ONE feature at a time:**
   - Implement
   - Test
   - Commit
   - Then next feature
6. **If something breaks:**
   - STOP
   - `git diff` (show what changed)
   - `git checkout -- <file>` (revert)
   - Try again with smaller change
7. **NEVER delete existing code unless explicitly asked**
8. **Show diff BEFORE applying changes to critical files** (dashboard.tsx, main.rs, etc.)

## Current Tasks
- [2024-11-29] Fixed "Find Button" feature - added real Tauri event listener to tauri-bridge.ts
- [2024-11-29] Fixed device auto-selection after "Find Button" (stale closure fix)
- [2024-11-29] Fixed System Log panel - logs now update via direct React state
- [2024-11-29] Added log entries: preset applied, application selected, logs copied/exported
- [2024-11-29] Updated icons: icon-256.png for header, icon-64.png for tray
- [2024-12-02] Added hotkey simulation via Windows SendInput API (`src-tauri/src/hotkey.rs`)
- [2024-12-02] Fixed argument parsing for paths with spaces (`parse_arguments()` function)
- [2024-12-02] Added Hotkeys preset category (Ctrl+C, Ctrl+V, Ctrl+Z, etc.)
- [2024-12-02] Added unit tests for parse_arguments (8 tests passing)
- [2024-12-02] Setup Playwright E2E test framework
- [2024-12-02] Created Tauri E2E testing with Playwright + CDP (solved tauri-driver empty page issue)
- [2024-12-02] Added smoke test for app launch verification
- [2024-12-02] Added full E2E test with 11 checks (device selection, config, save, actions)
- [2024-12-02] Added interactive mode with sound alerts for physical button testing

## New Files (2024-12-02)
- `src-tauri/src/hotkey.rs` - Windows SendInput API for hotkey simulation
- `tests/e2e/app.spec.ts` - Playwright E2E tests (frontend)
- `tests/tauri/smoke.test.ts` - App launch smoke test
- `tests/tauri/full-e2e.test.ts` - Full E2E with CDP, interactive mode
- `tests/tauri/tauri-playwright.test.ts` - Basic CDP connection test
- `playwright.config.ts` - Playwright configuration
- `wdio.conf.ts` - WebDriverIO config (experimental, has issues)

## Testing Commands
```bash
# Run ALL tests
npm run test              # Rust unit tests (13 tests)
npm run check             # TypeScript type checker
npm run test:e2e          # Playwright frontend tests (5 tests)
npm run test:smoke        # Tauri app smoke test (6 tests)
npm run test:e2e:full     # Full E2E with CDP (11 tests) - AUTOMATED
npm run test:e2e:interactive  # Full E2E with physical button prompts
```

### Tauri E2E Testing (Playwright + CDP)

**Problem solved:** `tauri-driver` shows empty page with Tauri 2.x.

**Solution:** Use Playwright connecting directly to WebView2 via Chrome DevTools Protocol (CDP).

How it works:
1. Test launches `usb-configurator.exe` with env var `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9222`
2. Playwright connects via `chromium.connectOverCDP("http://127.0.0.1:9222")`
3. Full DOM access - clicks, inputs, screenshots all work

Test files:
- `tests/tauri/smoke.test.ts` - Basic app launch verification
- `tests/tauri/full-e2e.test.ts` - Complete UI testing with CDP
- `tests/tauri/tauri-playwright.test.ts` - Simple CDP connection test

### Interactive Mode
For testing physical USB button detection:
```bash
npm run test:e2e:interactive
```
This mode:
- Plays sound alert (Windows beep) when action needed
- Prompts user to press physical button on USB device
- Waits for ENTER or timeout (30 sec)
- Verifies device was detected

### Test Coverage
| Test | What it verifies |
|------|------------------|
| Rust unit tests | Argument parsing, config, types |
| TypeScript check | Type safety across frontend |
| Playwright E2E | Frontend components in browser |
| Smoke test | App launches and runs without crash |
| Full E2E | Device selection, config, save, actions, logs |
| Interactive | Physical button → device detection flow |

## Next Steps
1. ~~Device disconnection handling~~ ✅ Done
2. ~~Double-press/Long-press detection~~ ✅ Done
3. ~~Unit tests~~ ✅ Done (13 Rust + 5 Playwright + 11 E2E)
4. ~~Documentation~~ ✅ Done (README troubleshooting)

## Known Issues
- [SOLVED 2024-11-29] Events from backend not reaching frontend - reason: tauri-bridge.ts used only mock event system. Fixed by adding `listen()` from `@tauri-apps/api/event`
- [SOLVED 2024-11-29] System Log panel not updating - reason: `TauriBridge.addLog()` emits to mock eventListeners, but `TauriBridge.on()` in Tauri mode uses real Tauri events (different systems!). Fixed by updating React state directly in `addLog` callback.
- [SOLVED 2024-11-29] Device not highlighted after "Find Button" success - reason: `handleSelectDevice` called from useEffect with `[]` deps has stale `devices` closure (empty array). Fixed by using `setSelectedDeviceId()` directly instead of `handleSelectDevice()`.
- [SOLVED 2024-12-02] tauri-driver + WebDriverIO shows empty page - tauri-driver with Tauri 2.x opens Edge but doesn't load app content. **Solution:** Use Playwright with CDP connection directly to WebView2 (`chromium.connectOverCDP`). Set env var `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9222` before launching app.
- [SOLVED 2024-12-02] Windows UI Automation only sees system buttons - WebView2 doesn't expose DOM through Windows Accessibility API. Only window chrome (Minimize/Maximize/Close) is accessible. **Solution:** Use CDP for full DOM access.

## Common Pitfalls

### Tauri E2E Testing with CDP (Important!)
To test a Tauri 2.x app with Playwright:

```typescript
// 1. Launch app with remote debugging enabled
const env = {
  ...process.env,
  WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: '--remote-debugging-port=9222',
};
const appProcess = spawn(APP_PATH, [], { env });

// 2. Wait for CDP port
await fetch('http://127.0.0.1:9222/json/version'); // retry until available

// 3. Connect Playwright
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts()[0].pages()[0];

// 4. Now you have full DOM access!
await page.click('button:has-text("Find Button")');
```

**DO NOT use:** `tauri-driver` + WebDriverIO (shows empty page with Tauri 2.x)
**DO NOT use:** Windows UI Automation (only sees window chrome, not WebView content)

### Interactive Testing for Physical Devices
When testing requires physical button press:
- Use `--interactive` flag: `npm run test:e2e:interactive`
- Test plays beep sound to alert user
- Waits for user to press ENTER after physical action
- 30 second timeout by default

### TauriBridge Dual Event Systems
`tauri-bridge.ts` has TWO separate event systems that don't communicate:
1. **Tauri mode**: Uses `listen()` from `@tauri-apps/api/event` for real Tauri events
2. **Dev/mock mode**: Uses local `eventListeners` Map for mock events

`TauriBridge.addLog()` only emits to mock eventListeners. For UI updates, modify React state directly.

### Stale Closures in useEffect
Callbacks defined inside `useEffect(() => {...}, [])` capture state at mount time. If the callback uses state variables, they will be stale when the callback executes later.

**Bad:**
```typescript
useEffect(() => {
  TauriBridge.on("event", (data) => {
    handleSelectDevice(data.id); // handleSelectDevice has stale `devices`
  });
}, []);
```

**Good:**
```typescript
useEffect(() => {
  TauriBridge.on("event", (data) => {
    setSelectedDeviceId(data.id); // setState works correctly
    setConfig({ ... }); // direct state updates
  });
}, []);
```