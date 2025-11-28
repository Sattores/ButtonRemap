use crate::types::{
    ActionConfig, AppSettings, DeviceBinding, HidDevice, IpcResult, LogEntry, LogEntryLevel,
    MonitoringState, TriggerType,
};
use crate::AppState;
use std::process::Command;
use tauri::State;

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
pub async fn refresh_devices(state: State<'_, AppState>) -> Result<IpcResult<Vec<HidDevice>>, String> {
    let mut hid = state.hid_manager.lock().map_err(|e| e.to_string())?;
    
    match hid.refresh_devices() {
        Ok(devices) => {
            // Log the refresh
            let mut config = state.config_manager.lock().map_err(|e| e.to_string())?;
            config.add_log(
                LogEntryLevel::Info,
                format!("Found {} HID devices", devices.len()),
                Some("HID".to_string()),
            );
            
            Ok(IpcResult::ok(devices))
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
pub async fn start_monitoring(state: State<'_, AppState>) -> Result<IpcResult<()>, String> {
    let hid = state.hid_manager.lock().map_err(|e| e.to_string())?;
    
    match hid.start_monitoring() {
        Ok(_) => {
            let mut config = state.config_manager.lock().map_err(|e| e.to_string())?;
            config.add_log(
                LogEntryLevel::Info,
                "Started 'Find by Press' monitoring".to_string(),
                Some("HID".to_string()),
            );
            Ok(IpcResult::ok_empty())
        }
        Err(e) => Ok(IpcResult::err(e.to_string())),
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
                    .args(action.arguments.split_whitespace())
                    .spawn()
            } else {
                Command::new(&action.executable_path)
                    .args(action.arguments.split_whitespace())
                    .spawn()
            }
        }
        crate::types::ActionType::SystemCommand => {
            if cfg!(target_os = "windows") {
                Command::new("cmd")
                    .args(["/C", &action.executable_path, &action.arguments])
                    .spawn()
            } else {
                Command::new("sh")
                    .args(["-c", &format!("{} {}", action.executable_path, action.arguments)])
                    .spawn()
            }
        }
        crate::types::ActionType::Hotkey => {
            // Hotkey simulation would require Windows API
            log::info!("Hotkey simulation not implemented in test mode");
            return Ok(IpcResult::ok_empty());
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
pub async fn open_file_dialog(filters: Option<Vec<String>>) -> Result<IpcResult<Option<String>>, String> {
    // In production, this would use native file dialog
    // For now, return a placeholder
    Ok(IpcResult::ok(None))
}

#[tauri::command]
pub async fn get_app_version() -> Result<IpcResult<String>, String> {
    Ok(IpcResult::ok(env!("CARGO_PKG_VERSION").to_string()))
}
