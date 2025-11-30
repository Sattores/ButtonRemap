// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod config;
mod hid;
mod input_monitor;
mod types;

#[cfg(windows)]
mod rawinput;

#[cfg(windows)]
mod listener;

use config::ConfigManager;
use hid::HidManager;
use std::sync::{Arc, Mutex};
use tauri::Manager;

pub struct AppState {
    pub config_manager: Arc<Mutex<ConfigManager>>,
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

    // Wrap config_manager in Arc for sharing with background listener
    let config_manager = Arc::new(Mutex::new(config_manager));
    let config_manager_for_listener = config_manager.clone();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState {
            config_manager,
            hid_manager: Mutex::new(hid_manager),
        })
        .setup(move |app| {
            log::info!("USB Configurator starting...");

            // Start background listener for configured devices
            #[cfg(windows)]
            {
                let listener = listener::BackgroundListener::new(config_manager_for_listener.clone());
                listener.start();
                log::info!("Background listener started");
            }

            // Initialize system tray if available
            #[cfg(desktop)]
            {
                use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
                use tauri::menu::{Menu, MenuItem};

                let show_item = MenuItem::with_id(app, "show", "Show Window", true, None::<&str>)?;
                let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
                let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

                let _tray = TrayIconBuilder::new()
                    .icon(app.default_window_icon().unwrap().clone())
                    .menu(&menu)
                    .show_menu_on_left_click(false)
                    .on_menu_event(|app, event| {
                        match event.id.as_ref() {
                            "show" => {
                                if let Some(window) = app.get_webview_window("main") {
                                    let _ = window.show();
                                    let _ = window.set_focus();
                                }
                            }
                            "quit" => {
                                app.exit(0);
                            }
                            _ => {}
                        }
                    })
                    .on_tray_icon_event(|tray, event| {
                        if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
                            if let Some(window) = tray.app_handle().get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    })
                    .build(app)?;

                log::info!("System tray initialized");
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
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                window.hide().unwrap();
                api.prevent_close();
            }
        })
        .run(tauri::generate_context!())
        .expect("Error while running USB Configurator");
}
