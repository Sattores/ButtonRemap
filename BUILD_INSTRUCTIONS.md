# Build Instructions for Windows 11 (Tauri)

This project is designed to be compiled into a native Windows 11 application using **Tauri**. Tauri combines this React frontend with a lightweight Rust backend for high performance and native USB access.

## Prerequisites

1.  **Install Node.js**: [nodejs.org](https://nodejs.org/)
2.  **Install Rust**: [rustup.rs](https://rustup.rs/)
3.  **Install Build Tools for Visual Studio 2022** (required for Rust on Windows).

## Step 1: Initialize Tauri Project

Open your terminal (PowerShell or CMD) and run:

```bash
npm create tauri-app@latest
```

-   **Project name:** `usb-configurator`
-   **Frontend language:** `TypeScript / JavaScript`
-   **Package manager:** `npm`
-   **UI Template:** `React`

## Step 2: Migrate Frontend Code

Copy the `client/src` folder from this Replit project into the `src` folder of your new Tauri project, overwriting existing files.

Copy `client/index.html` to the root of the Tauri project.

Install the frontend dependencies in your new project:

```bash
npm install framer-motion lucide-react shadcn-ui @radix-ui/react-slot class-variance-authority clsx tailwind-merge
```

## Step 3: Configure Rust Backend (USB Logic)

Navigate to the `src-tauri` folder. You need to add the `hidapi` dependency to work with USB devices.

Edit `src-tauri/Cargo.toml`:

```toml
[dependencies]
tauri = { version = "1", features = ["shell-open"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
hidapi = "2.4" # Library for USB HID access
```

Edit `src-tauri/src/main.rs` to handle USB events. (See `RUST_BACKEND_REFERENCE.md` for the code).

## Step 4: Build for Windows

In your project root, run:

```bash
npm run tauri build
```

This will generate a lightweight `.msi` installer and `.exe` file in `src-tauri/target/release/bundle/msi/`.

## Why Tauri?

-   **Size:** The final app will be ~5MB (Electron is ~100MB+).
-   **Performance:** Uses Rust for the heavy lifting (USB polling).
-   **Security:** Frontend cannot execute system commands directly without Rust's permission.
