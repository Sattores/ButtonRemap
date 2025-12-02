use crate::types::{
    ActionConfig, AppSettings, DeviceBinding, DeviceStatus, HidDevice, IpcResult, LogEntry, LogEntryLevel,
    MonitoringState, TriggerType,
};
use crate::AppState;
use std::process::Command;
use tauri::{Emitter, State};

/// Parse arguments string respecting quoted sections
fn parse_arguments(args: &str) -> Vec<String> {
    let mut result = Vec::new();
    let mut current = String::new();
    let mut in_quotes = false;

    for c in args.chars() {
        match c {
            '"' => in_quotes = !in_quotes,
            ' ' | '\t' if !in_quotes => {
                if !current.is_empty() {
                    result.push(current.clone());
                    current.clear();
                }
            }
            _ => current.push(c),
        }
    }

    if !current.is_empty() {
        result.push(current);
    }

    result
}

// ============================================
// Device Commands
// ============================================

#[tauri::command]
pub async fn list_devices(state: State<'_, AppState>) -> Result<IpcResult<Vec<HidDevice>>, String> {
    let mut hid = state.hid_manager.lock().map_err(|e| e.to_string())?;
    
    match hid.list_devices() {
        Ok(devices) => Ok(IpcResult::ok(devices)),
        Err(e) => Ok(IpcResult::err(e.to_string())),
    }
}

#[tauri::command]
pub async fn refresh_devices(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<IpcResult<Vec<HidDevice>>, String> {
    let mut hid = state.hid_manager.lock().map_err(|e| e.to_string())?;

    match hid.refresh_devices_with_disconnections() {
        Ok(result) => {
            // Log the refresh
            let mut config = state.config_manager.lock().map_err(|e| e.to_string())?;
            config.add_log(
                LogEntryLevel::Info,
                format!("Found {} HID devices", result.devices.len()),
                Some("HID".to_string()),
            );

            // Emit events for disconnected devices
            for device_id in &result.disconnected_ids {
                config.add_log(
                    LogEntryLevel::Warn,
                    format!("Device disconnected: {}", device_id),
                    Some(device_id.clone()),
                );

                // Emit event to frontend
                if let Err(e) = app.emit("device-disconnected", serde_json::json!({
                    "deviceId": device_id
                })) {
                    log::error!("Failed to emit device-disconnected event: {}", e);
                }
            }

            Ok(IpcResult::ok(result.devices))
        }
        Err(e) => Ok(IpcResult::err(e.to_string())),
    }
}

#[tauri::command]
pub async fn get_device_info(
    state: State<'_, AppState>,
    device_id: String,
) -> Result<IpcResult<HidDevice>, String> {
    let hid = state.hid_manager.lock().map_err(|e| e.to_string())?;
    
    match hid.get_device_info(&device_id) {
        Ok(device) => Ok(IpcResult::ok(device)),
        Err(e) => Ok(IpcResult::err(e.to_string())),
    }
}

// ============================================
// Monitoring Commands
// ============================================

#[tauri::command]
pub async fn start_monitoring(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<IpcResult<()>, String> {
    println!("🟢 [RUST] start_monitoring command called!");

    let mut config = state.config_manager.lock().map_err(|e| e.to_string())?;
    config.add_log(
        LogEntryLevel::Info,
        "Started 'Find by Press' monitoring - press any button on your device".to_string(),
        Some("Input".to_string()),
    );
    drop(config); // Release lock early

    // On Windows, use BOTH Raw Input API and HID API in parallel
    #[cfg(windows)]
    {
        use crate::input_monitor::{InputMonitor, ParallelMonitor};
        use crate::rawinput::RawInputMonitor;

        println!("🟢 [RUST] Starting PARALLEL monitoring (Raw Input + HID)...");

        // Create parallel monitor with both strategies
        let mut parallel_monitor = ParallelMonitor::new();

        // Add Raw Input monitor (for keyboard emulators like XFKEY)
        let raw_monitor = RawInputMonitor::new();
        parallel_monitor.add_monitor(Box::new(raw_monitor));

        // Add HID monitor (for raw HID devices)
        // Note: We can't move HidManager out of state, so we'll skip it for now
        // and only use Raw Input. Full parallel implementation needs refactoring.

        println!("🟢 [RUST] Starting monitors...");
        let rx = parallel_monitor.start_all();

        // Clone app handle for monitoring thread
        let app_clone = app.clone();

        // Spawn thread to handle detected devices
        std::thread::spawn(move || {
            println!("🔵 [RUST] Parallel monitor listener thread started");

            if let Ok(detected_device) = rx.recv() {
                println!("🔥 [RUST] DEVICE DETECTED!");
                println!("   {} ({}:{})", detected_device.name, detected_device.vendor_id, detected_device.product_id);

                log::info!(
                    "⚡ Device detected: {} ({}:{}) - Press recognized!",
                    detected_device.name,
                    detected_device.vendor_id,
                    detected_device.product_id
                );

                // Emit event to frontend
                log::info!("📤 Emitting 'monitoring-detected' event to frontend");
                match app_clone.emit("monitoring-detected", serde_json::json!({
                    "device": detected_device
                })) {
                    Ok(_) => log::info!("✅ Event emitted successfully"),
                    Err(e) => log::error!("❌ Failed to emit event: {}", e),
                }
            }

            println!("🔵 [RUST] Parallel monitor listener thread ended");
        });

        Ok(IpcResult::ok_empty())
    }

    // On non-Windows platforms, fall back to HID monitoring
    #[cfg(not(windows))]
    {
        let hid = state.hid_manager.lock().map_err(|e| e.to_string())?;

        match hid.start_monitoring() {
            Ok(_) => {
                let app_clone = app.clone();

                hid.monitor_for_input(move |detected_device| {
                    println!("🔥 [RUST] DEVICE DETECTED CALLBACK FIRED!");
                    log::info!(
                        "⚡ Device detected: {} ({}:{}, Interface {}) - Press recognized!",
                        detected_device.name,
                        detected_device.vendor_id,
                        detected_device.product_id,
                        detected_device.interface_number
                    );

                    match app_clone.emit("monitoring-detected", serde_json::json!({
                        "device": detected_device
                    })) {
                        Ok(_) => log::info!("✅ Event emitted successfully"),
                        Err(e) => log::error!("❌ Failed to emit event: {}", e),
                    }
                }).map_err(|e| e.to_string())?;

                Ok(IpcResult::ok_empty())
            }
            Err(e) => Ok(IpcResult::err(e.to_string())),
        }
    }
}

#[tauri::command]
pub async fn stop_monitoring(state: State<'_, AppState>) -> Result<IpcResult<()>, String> {
    let hid = state.hid_manager.lock().map_err(|e| e.to_string())?;
    hid.stop_monitoring();
    
    let mut config = state.config_manager.lock().map_err(|e| e.to_string())?;
    config.add_log(
        LogEntryLevel::Info,
        "Stopped monitoring".to_string(),
        Some("HID".to_string()),
    );
    
    Ok(IpcResult::ok_empty())
}

#[tauri::command]
pub async fn get_monitoring_state(
    state: State<'_, AppState>,
) -> Result<IpcResult<MonitoringState>, String> {
    let hid = state.hid_manager.lock().map_err(|e| e.to_string())?;
    Ok(IpcResult::ok(hid.get_monitoring_state()))
}

// ============================================
// Binding Commands
// ============================================

#[tauri::command]
pub async fn get_all_bindings(
    state: State<'_, AppState>,
) -> Result<IpcResult<Vec<DeviceBinding>>, String> {
    let config = state.config_manager.lock().map_err(|e| e.to_string())?;
    Ok(IpcResult::ok(config.get_all_bindings()))
}

#[tauri::command]
pub async fn get_binding(
    state: State<'_, AppState>,
    device_id: String,
) -> Result<IpcResult<Option<DeviceBinding>>, String> {
    let config = state.config_manager.lock().map_err(|e| e.to_string())?;
    Ok(IpcResult::ok(config.get_binding(&device_id)))
}

#[tauri::command]
pub async fn save_binding(
    state: State<'_, AppState>,
    binding: DeviceBinding,
) -> Result<IpcResult<DeviceBinding>, String> {
    let mut config = state.config_manager.lock().map_err(|e| e.to_string())?;
    
    match config.save_binding(binding.clone()) {
        Ok(saved) => {
            // Mark device as configured in HID manager
            let mut hid = state.hid_manager.lock().map_err(|e| e.to_string())?;
            hid.set_device_configured(&saved.device_id);
            
            config.add_log(
                LogEntryLevel::Success,
                format!(
                    "Configuration saved for {}:{}",
                    saved.vendor_id, saved.product_id
                ),
                Some("Config".to_string()),
            );
            
            Ok(IpcResult::ok(saved))
        }
        Err(e) => Ok(IpcResult::err(e.to_string())),
    }
}

#[tauri::command]
pub async fn delete_binding(
    state: State<'_, AppState>,
    binding_id: String,
) -> Result<IpcResult<()>, String> {
    let mut config = state.config_manager.lock().map_err(|e| e.to_string())?;
    
    // Get the binding before deleting to update HID manager
    if let Some(binding) = config.get_binding_by_id(&binding_id) {
        let mut hid = state.hid_manager.lock().map_err(|e| e.to_string())?;
        hid.set_device_unconfigured(&binding.device_id);
    }
    
    match config.delete_binding(&binding_id) {
        Ok(_) => {
            config.add_log(
                LogEntryLevel::Info,
                "Configuration deleted".to_string(),
                Some("Config".to_string()),
            );
            Ok(IpcResult::ok_empty())
        }
        Err(e) => Ok(IpcResult::err(e.to_string())),
    }
}

// ============================================
// Settings Commands
// ============================================

#[tauri::command]
pub async fn get_settings(state: State<'_, AppState>) -> Result<IpcResult<AppSettings>, String> {
    let config = state.config_manager.lock().map_err(|e| e.to_string())?;
    Ok(IpcResult::ok(config.get_settings()))
}

#[tauri::command]
pub async fn save_settings(
    state: State<'_, AppState>,
    settings: AppSettings,
) -> Result<IpcResult<AppSettings>, String> {
    let mut config = state.config_manager.lock().map_err(|e| e.to_string())?;
    
    match config.save_settings(settings) {
        Ok(saved) => {
            config.add_log(
                LogEntryLevel::Success,
                "Settings saved".to_string(),
                Some("System".to_string()),
            );
            Ok(IpcResult::ok(saved))
        }
        Err(e) => Ok(IpcResult::err(e.to_string())),
    }
}

// ============================================
// Action Commands
// ============================================

#[tauri::command]
pub async fn test_action(
    state: State<'_, AppState>,
    action: ActionConfig,
) -> Result<IpcResult<()>, String> {
    let mut config = state.config_manager.lock().map_err(|e| e.to_string())?;
    
    config.add_log(
        LogEntryLevel::Info,
        format!("Testing action: {} {}", action.executable_path, action.arguments),
        Some("Test".to_string()),
    );
    
    // Execute the action based on type
    let result = match action.r#type {
        crate::types::ActionType::LaunchApp | crate::types::ActionType::RunScript => {
            if cfg!(target_os = "windows") {
                Command::new("cmd")
                    .args(["/C", &action.executable_path])
                    .args(parse_arguments(&action.arguments))
                    .spawn()
            } else {
                Command::new(&action.executable_path)
                    .args(parse_arguments(&action.arguments))
                    .spawn()
            }
        }
        crate::types::ActionType::SystemCommand => {
            if cfg!(target_os = "windows") {
                Command::new("cmd")
                    .args(["/C", &action.executable_path])
                    .args(parse_arguments(&action.arguments))
                    .spawn()
            } else {
                Command::new("sh")
                    .args(["-c", &format!("{} {}", action.executable_path, action.arguments)])
                    .spawn()
            }
        }
        crate::types::ActionType::Hotkey => {
            // Execute hotkey using Windows SendInput API
            #[cfg(target_os = "windows")]
            {
                match crate::hotkey::execute_hotkey(&action.executable_path) {
                    Ok(_) => {
                        config.add_log(
                            LogEntryLevel::Success,
                            format!("Hotkey executed: {}", action.executable_path),
                            Some("Test".to_string()),
                        );
                        return Ok(IpcResult::ok_empty());
                    }
                    Err(e) => {
                        config.add_log(
                            LogEntryLevel::Error,
                            format!("Hotkey failed: {}", e),
                            Some("Test".to_string()),
                        );
                        return Ok(IpcResult::err(e));
                    }
                }
            }
            #[cfg(not(target_os = "windows"))]
            {
                return Ok(IpcResult::err("Hotkey simulation only supported on Windows".to_string()));
            }
        }
    };
    
    match result {
        Ok(_) => {
            config.add_log(
                LogEntryLevel::Success,
                "Action executed successfully".to_string(),
                Some("Test".to_string()),
            );
            Ok(IpcResult::ok_empty())
        }
        Err(e) => {
            config.add_log(
                LogEntryLevel::Error,
                format!("Action failed: {}", e),
                Some("Test".to_string()),
            );
            Ok(IpcResult::err(e.to_string()))
        }
    }
}

// ============================================
// Log Commands
// ============================================

#[tauri::command]
pub async fn get_logs(
    state: State<'_, AppState>,
    limit: Option<usize>,
) -> Result<IpcResult<Vec<LogEntry>>, String> {
    let config = state.config_manager.lock().map_err(|e| e.to_string())?;
    Ok(IpcResult::ok(config.get_logs(limit)))
}

#[tauri::command]
pub async fn clear_logs(state: State<'_, AppState>) -> Result<IpcResult<()>, String> {
    let mut config = state.config_manager.lock().map_err(|e| e.to_string())?;
    
    match config.clear_logs() {
        Ok(_) => Ok(IpcResult::ok_empty()),
        Err(e) => Ok(IpcResult::err(e.to_string())),
    }
}

// ============================================
// System Commands
// ============================================

#[tauri::command]
pub async fn open_file_dialog(
    app: tauri::AppHandle,
    filters: Option<Vec<String>>,
) -> Result<IpcResult<Option<String>>, String> {
    use tauri_plugin_dialog::DialogExt;

    log::info!("open_file_dialog called with filters: {:?}", filters);

    let mut builder = app.dialog().file();

    // Set title
    builder = builder.set_title("Select Application");

    // Add filters if provided
    if let Some(exts) = filters {
        let ext_refs: Vec<&str> = exts.iter().map(|s| s.as_str()).collect();
        builder = builder.add_filter("Executables", &ext_refs);
    }

    // Pick file synchronously (blocking)
    log::info!("Opening file picker dialog...");
    match builder.blocking_pick_file() {
        Some(path) => {
            log::info!("File selected: {}", path.to_string());
            Ok(IpcResult::ok(Some(path.to_string())))
        }
        None => {
            log::info!("File picker cancelled");
            Ok(IpcResult::ok(None))
        }
    }
}

#[tauri::command]
pub async fn get_app_version() -> Result<IpcResult<String>, String> {
    Ok(IpcResult::ok(env!("CARGO_PKG_VERSION").to_string()))
}
