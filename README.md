# ButtonRemap - USB Configurator

A powerful Tauri-based desktop application for Windows that allows you to map USB HID device buttons to system actions, including launching applications, running scripts, executing hotkeys, and system commands.

## Features

- **USB Device Detection**: Automatically detect and configure USB HID devices
- **Flexible Action Mapping**: Map buttons to various actions:
  - Launch applications with custom arguments
  - Run PowerShell/Batch scripts
  - Execute system commands
  - Trigger keyboard hotkeys
- **Real-time Monitoring**: Live button press detection for easy configuration
- **Persistent Configuration**: Save and load device bindings automatically
- **Modern UI**: Built with React and shadcn/ui component library
- **Cross-layer Type Safety**: Shared TypeScript/Rust type definitions

## Prerequisites

- **Node.js** (v18 or higher)
- **Rust** (latest stable via [rustup](https://rustup.rs/))
- **Visual Studio Build Tools** (for Windows development)
  - Desktop development with C++ workload

## Installation

1. Clone the repository:
```bash
git clone https://github.com/Sattores/ButtonRemap.git
cd ButtonRemap
```

2. Install dependencies:
```bash
npm install
```

## Development

Run the application in development mode with hot-reload:

```bash
npm run tauri:dev
```

This will:
- Start the Vite development server on port 5000
- Launch the Tauri application
- Enable hot-reload for frontend changes
- Automatically recompile Rust code when modified

### Frontend Only Development

```bash
npm run dev         # Start Vite dev server
npm run build       # Build frontend to dist/
npm run check       # Run TypeScript type checker
```

### Backend Only Development

```bash
cd src-tauri
cargo build         # Debug build
cargo build --release  # Release build
cargo test          # Run tests
```

## Building for Production

### Using npm scripts:
```bash
npm run tauri:build
```

### Using the build script:
```bash
build.bat
```

The built application will be available in:
- **MSI Installer**: `src-tauri/target/release/bundle/msi/`
- **Executable**: `src-tauri/target/release/`

## Project Structure

```
ButtonRemap/
├── client/                 # React frontend
│   ├── src/
│   │   ├── pages/         # UI pages (dashboard, configuration)
│   │   ├── components/    # React components
│   │   │   └── ui/        # shadcn/ui component library
│   │   ├── lib/           # Utilities and Tauri bridge
│   │   └── hooks/         # React hooks
│   └── index.html
│
├── shared/                # Shared TypeScript types
│   ├── types.ts          # Data models (mirrored in Rust)
│   ├── ipc.ts            # IPC command/event names
│   ├── schema.ts         # Zod validation schemas
│   └── presets.ts        # Action presets
│
├── src-tauri/            # Rust backend
│   ├── src/
│   │   ├── main.rs       # Application entry point
│   │   ├── commands.rs   # Tauri IPC handlers
│   │   ├── hid.rs        # USB HID device manager
│   │   ├── config.rs     # Configuration persistence
│   │   └── types.rs      # Rust structs (mirrors shared/types.ts)
│   ├── Cargo.toml
│   └── tauri.conf.json
│
└── README.md
```

## Tech Stack

### Frontend
- **React** - UI framework
- **TypeScript** - Type-safe JavaScript
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Component library (Radix UI + Tailwind)
- **TanStack Query** - Server state management
- **Zod** - Schema validation

### Backend
- **Tauri** - Desktop application framework
- **Rust** - Systems programming language
- **hidapi** - USB HID device access
- **serde** - Serialization/deserialization

## Architecture

The application uses a modern architecture with clear separation of concerns:

- **IPC Communication**: Frontend and backend communicate via Tauri's IPC system
- **Type Safety**: Shared type definitions between TypeScript and Rust
- **State Management**: TanStack Query for frontend, Mutex-based state in Rust
- **Configuration**: JSON-based persistence in user config directory

### IPC Flow Example

1. User clicks "Find Button" → Frontend calls `TauriBridge.startMonitoring()`
2. Frontend → Backend: IPC command `start_monitoring`
3. Backend spawns monitoring thread, polls HID devices
4. Device input detected → Backend emits `monitoring-detected` event
5. Frontend receives event → Updates UI with detected device
6. User configures action → Frontend calls `TauriBridge.saveBinding()`
7. Backend saves configuration to JSON file

## Configuration Files

Device bindings are stored in:
- **Windows**: `%APPDATA%\usb-configurator\bindings.json`

Configuration includes:
- Device identification (VID/PID)
- Button-to-action mappings
- Action parameters (paths, arguments, etc.)

## Testing

### Unit Tests (Rust)

Run Rust unit tests for the backend:

```bash
npm run test
# or
cargo test --manifest-path src-tauri/Cargo.toml
```

### E2E Tests (Playwright)

Run frontend E2E tests with Playwright (tests the UI in browser):

```bash
npm run test:e2e
# or with UI mode
npm run test:e2e:ui
```

### Tauri E2E Tests (WebDriverIO)

Run full application E2E tests with WebDriverIO and tauri-driver:

**Prerequisites:**
1. Build the release version first:
   ```bash
   npm run tauri:build
   ```

2. Install [MSEdge WebDriver](https://developer.microsoft.com/en-us/microsoft-edge/tools/webdriver/) matching your Edge version:
   - Check Edge version: `"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --version`
   - Download matching driver from the link above
   - Add `msedgedriver.exe` to your PATH

3. Run the tests:
   ```bash
   npm run test:tauri
   ```

### Testing Actions in Code

You can test actions without saving bindings:

```typescript
import { TauriBridge } from '@/lib/tauri-bridge';

await TauriBridge.testAction({
  type: "launch-app",
  executablePath: "C:\\Program Files\\MyApp\\app.exe",
  arguments: "--flag value"
});
```

## Troubleshooting

### Device Not Detected

**Problem**: Your USB device doesn't appear in the device list.

**Solutions**:
1. **Refresh the device list** - Click the refresh button in the UI
2. **Check USB connection** - Try a different USB port
3. **Restart the application** - Close and reopen ButtonRemap
4. **Check permissions** - Run the application as Administrator

### "Find Button" Not Working

**Problem**: Pressing the button doesn't detect the device.

**Solutions**:
1. **Keyboard-emulating devices**: Some USB buttons (like XFKEY) emulate keyboards. They should work automatically.
2. **Raw HID devices**: May require the application to be run as Administrator
3. **Device conflicts**: Close other applications that might be using the device

### Actions Not Executing

**Problem**: Button press is detected but action doesn't run.

**Solutions**:
1. **Check the binding is enabled** - Look for the enabled toggle in configuration
2. **Verify executable path** - Ensure the path exists and is correct
3. **Paths with spaces** - Paths containing spaces are supported but double-check formatting
4. **Check System Log** - The log panel shows execution results and errors
5. **Trigger type mismatch** - If using double-press, make sure to press twice quickly (within 400ms)

### Hotkey Actions

**Problem**: Hotkey simulation not working.

**Solutions**:
1. **Use correct format**: Hotkeys should be formatted like `Ctrl+Shift+V` or `Alt+Tab`
2. **Supported modifiers**: `Ctrl`, `Alt`, `Shift`, `Win`
3. **Test first**: Use the "Test" button to verify the hotkey works
4. **Run as Administrator**: Some hotkeys require elevated permissions

### Application Crashes on Startup

**Solutions**:
1. **Reset configuration**: Delete `%APPDATA%\usb-configurator\` folder
2. **Check for port conflicts**: Kill any existing instances:
   ```bash
   taskkill /F /IM usb-configurator.exe
   ```
3. **Reinstall**: Download the latest version from releases

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "Failed to initialize HID API" | HID library issue | Reinstall the application |
| "Device not found" | Device disconnected | Reconnect the device |
| "Action failed" | Invalid path/command | Check the executable path |
| "Hotkey failed" | Invalid hotkey format | Use format like `Ctrl+C` |

### Debug Mode

For advanced troubleshooting, run with debug logging:

```bash
set RUST_LOG=debug
npm run tauri:dev
```

This will output detailed logs to the console including device detection events and action execution.

### Getting Help

If you're still having issues:
1. Check the [Issues](https://github.com/Sattores/ButtonRemap/issues) page
2. Create a new issue with:
   - Your Windows version
   - Device name and VID:PID
   - Steps to reproduce
   - Error messages from System Log

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the [MIT License](LICENSE).

## Acknowledgments

- Built with [Tauri](https://tauri.app/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- HID access via [hidapi](https://github.com/libusb/hidapi)

---

**Author**: Boris Gertsovsky
**GitHub**: [@Sattores](https://github.com/Sattores)
