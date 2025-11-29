// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod config;
mod hid;
mod input_monitor;
mod types;

#[cfg(windows)]
mod rawinput;

use config::ConfigManager;
use hid::HidManager;
use std::sync::Mutex;
use tauri::Manager;

pub struct AppState {
    pub config_manager: Mutex<ConfigManager>,
    pub hid_manager: Mutex<HidManager>,
}

fn main() {
    env_logger::init();
    
    let config_manager = ConfigManager::new().expect("Failed to initialize config manager");
    let mut hid_manager = HidManager::new().expect("Failed to initialize HID manager");
    
    // Initialize HID manager with configured device IDs from saved bindings
    for device_id in config_manager.get_configured_device_ids() {
        hid_manager.set_device_configured(&device_id);
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState {
            config_manager: Mutex::new(config_manager),
            hid_manager: Mutex::new(hid_manager),
        })
        .setup(|app| {
            log::info!("USB Configurator starting...");
            
            // Initialize system tray if available
            #[cfg(desktop)]
            {
                let handle = app.handle();
                // Tray icon setup would go here
                log::info!("Desktop mode initialized");
            }
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Device commands
            commands::list_devices,
            commands::refresh_devices,
            commands::get_device_info,
            // Monitoring commands
            commands::start_monitoring,
            commands::stop_monitoring,
            commands::get_monitoring_state,
            // Binding commands
            commands::get_all_bindings,
            commands::get_binding,
            commands::save_binding,
            commands::delete_binding,
            // Settings commands
            commands::get_settings,
            commands::save_settings,
            // Action commands
            commands::test_action,
            // Log commands
            commands::get_logs,
            commands::clear_logs,
            // System commands
            commands::open_file_dialog,
            commands::get_app_version,
        ])
        .run(tauri::generate_context!())
        .expect("Error while running USB Configurator");
}
