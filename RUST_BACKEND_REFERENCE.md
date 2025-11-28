// src-tauri/src/main.rs
// This is a reference implementation for the Rust backend

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use hidapi::HidApi;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use tauri::Manager;

// Define the payload struct for sending events to frontend
#[derive(Clone, serde::Serialize)]
struct UsbEvent {
    device_id: String,
    action: String, // "press", "release"
}

// Command to list devices
#[tauri::command]
fn list_usb_devices() -> Vec<String> {
    let api = HidApi::new().unwrap();
    let mut devices = Vec::new();
    
    for device in api.device_list() {
        // Filter for specific VIDs if needed, or return all
        devices.push(format!(
            "VID:{:04x} PID:{:04x} - {}",
            device.vendor_id(),
            device.product_id(),
            device.product_string().unwrap_or("Unknown")
        ));
    }
    devices
}

fn main() {
    // Initialize HID API in a separate thread for monitoring
    let api = Arc::new(Mutex::new(HidApi::new().unwrap()));
    
    tauri::Builder::default()
        .setup(|app| {
            let app_handle = app.handle();
            
            // Spawn a thread to monitor USB events (Simplified polling example)
            // In production, you might want to use specific HID read() blocking calls
            thread::spawn(move || {
                loop {
                    // Logic to read from opened device would go here
                    // if let Ok(data) = device.read(&mut buf) { ... }
                    
                    // Example: Emit event to frontend
                    // app_handle.emit_all("usb-event", UsbEvent { ... }).unwrap();
                    
                    thread::sleep(Duration::from_millis(100));
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![list_usb_devices])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
