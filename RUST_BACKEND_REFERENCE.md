# Rust Backend Reference

This document provides an overview of the Tauri Rust backend implementation for USB Configurator.

## Project Structure

The complete Rust backend is located in `tauri-app/src-tauri/`:

```
src-tauri/
├── src/
│   ├── main.rs        # Application entry point & setup
│   ├── commands.rs    # Tauri IPC command handlers
│   ├── hid.rs         # USB HID device management (hidapi)
│   ├── config.rs      # JSON configuration persistence
│   └── types.rs       # Rust type definitions (mirrors shared/types.ts)
├── Cargo.toml         # Rust dependencies
├── tauri.conf.json    # Tauri app configuration
└── build.rs           # Build script
```

## Key Components

### 1. HID Manager (`hid.rs`)

Handles USB HID device enumeration and monitoring:

```rust
pub struct HidManager {
    api: HidApi,
    monitoring_active: Arc<AtomicBool>,
    configured_devices: Vec<String>,
}

impl HidManager {
    pub fn list_devices(&mut self) -> Result<Vec<HidDevice>, HidError>;
    pub fn start_monitoring(&self) -> Result<(), HidError>;
    pub fn stop_monitoring(&self);
    pub fn get_device_info(&self, device_id: &str) -> Result<HidDevice, HidError>;
}
```

### 2. Config Manager (`config.rs`)

Persists bindings and settings to JSON files:

```rust
pub struct ConfigManager {
    config_path: PathBuf,  // ~/.config/usb-configurator/config.json
    logs_path: PathBuf,    // ~/.config/usb-configurator/logs.json
    data: ConfigData,
    logs: Vec<LogEntry>,
}

impl ConfigManager {
    pub fn get_all_bindings(&self) -> Vec<DeviceBinding>;
    pub fn save_binding(&mut self, binding: DeviceBinding) -> Result<DeviceBinding, ConfigError>;
    pub fn get_settings(&self) -> AppSettings;
    pub fn add_log(&mut self, level: LogEntryLevel, message: String, source: Option<String>);
}
```

### 3. IPC Commands (`commands.rs`)

Tauri command handlers that bridge frontend requests to backend services:

```rust
#[tauri::command]
pub async fn list_devices(state: State<'_, AppState>) -> Result<IpcResult<Vec<HidDevice>>, String>;

#[tauri::command]
pub async fn save_binding(state: State<'_, AppState>, binding: DeviceBinding) -> Result<IpcResult<DeviceBinding>, String>;

#[tauri::command]
pub async fn test_action(state: State<'_, AppState>, action: ActionConfig) -> Result<IpcResult<()>, String>;
```

### 4. Type Definitions (`types.rs`)

Rust structs that match the TypeScript interfaces in `shared/types.ts`:

```rust
#[derive(Serialize, Deserialize)]
pub struct HidDevice {
    pub id: String,
    pub name: String,
    pub vendor_id: String,
    pub product_id: String,
    pub status: DeviceStatus,
    // ...
}

#[derive(Serialize, Deserialize)]
pub struct DeviceBinding {
    pub id: String,
    pub device_id: String,
    pub trigger_type: TriggerType,
    pub action: ActionConfig,
    // ...
}
```

## IPC Communication

### Frontend → Backend (Commands)

The frontend calls backend functions via `window.__TAURI__.invoke()`:

```typescript
// Frontend (tauri-bridge.ts)
const result = await window.__TAURI__.invoke('list_devices');
```

```rust
// Backend (commands.rs)
#[tauri::command]
pub async fn list_devices(state: State<'_, AppState>) -> Result<IpcResult<Vec<HidDevice>>, String> {
    let mut hid = state.hid_manager.lock().unwrap();
    match hid.list_devices() {
        Ok(devices) => Ok(IpcResult::ok(devices)),
        Err(e) => Ok(IpcResult::err(e.to_string())),
    }
}
```

### Backend → Frontend (Events)

The backend emits events for real-time updates:

```rust
// Backend
app_handle.emit_all("device-detected", payload)?;
```

```typescript
// Frontend
window.__TAURI__.event.listen('device-detected', (event) => {
    console.log('Device detected:', event.payload);
});
```

## Building

### Development

```bash
cd tauri-app
cargo build
```

### Release

```bash
npm run tauri build
```

This produces:
- `target/release/usb-configurator.exe`
- `target/release/bundle/msi/USB Configurator_*.msi`

## Dependencies

From `Cargo.toml`:

| Crate | Purpose |
|-------|---------|
| `tauri` | Application framework |
| `hidapi` | USB HID device access |
| `serde` / `serde_json` | JSON serialization |
| `tokio` | Async runtime |
| `uuid` | Unique ID generation |
| `chrono` | Timestamps |
| `dirs` | Cross-platform config paths |
| `thiserror` | Error handling |

## USB Device Detection Flow

1. User clicks "Find Button" → `start_monitoring` command
2. Rust spawns monitoring thread polling HID devices
3. When input detected → `monitoring-detected` event emitted
4. Frontend receives event → updates UI with detected device
5. User configures binding → `save_binding` command
6. Rust saves to JSON + marks device as configured

## Action Execution

When a bound device sends input:

1. HID thread detects input from configured device
2. Lookup binding by device VID:PID
3. Execute action based on `ActionConfig.type`:
   - `launch-app`: `Command::new(executable_path).args(...).spawn()`
   - `run-script`: Execute script file
   - `system-command`: Run system command
   - `hotkey`: Simulate keyboard input (Windows API)
4. Log result to `logs.json`
