use crate::config::ConfigManager;
use crate::rawinput::RawInputMonitor;
use crate::types::{ActionConfig, ActionType, LogEntryLevel};
use std::process::Command;
use std::sync::{Arc, Mutex};
use std::thread;

/// Background listener that monitors for device input and executes configured actions
pub struct BackgroundListener {
    config_manager: Arc<Mutex<ConfigManager>>,
}

impl BackgroundListener {
    pub fn new(config_manager: Arc<Mutex<ConfigManager>>) -> Self {
        Self { config_manager }
    }

    /// Start the background listener in a separate thread
    pub fn start(self) {
        thread::spawn(move || {
            log::info!("Background listener starting...");
            self.run_listener();
        });
    }

    fn run_listener(self) {
        let mut monitor = RawInputMonitor::new();
        let rx = monitor.start_monitoring_persistent();

        log::info!("Background listener active, waiting for device input...");

        while let Ok(device) = rx.recv() {
            let device_id = format!("{}:{}", device.vendor_id, device.product_id);
            log::info!("Device input detected: {}", device_id);

            // Look up binding for this device
            if let Ok(config) = self.config_manager.lock() {
                if let Some(binding) = config.get_binding(&device_id) {
                    if binding.enabled {
                        log::info!("Executing action for device: {}", device_id);
                        drop(config); // Release lock before executing
                        self.execute_action(&binding.action, &device_id);
                    } else {
                        log::debug!("Binding disabled for device: {}", device_id);
                    }
                } else {
                    log::debug!("No binding configured for device: {}", device_id);
                }
            }
        }

        log::warn!("Background listener stopped");
    }

    fn execute_action(&self, action: &ActionConfig, device_id: &str) {
        log::info!("Executing: {} {}", action.executable_path, action.arguments);

        let result = match action.r#type {
            ActionType::LaunchApp => {
                // Launch executable directly (supports paths with spaces)
                let mut cmd = Command::new(&action.executable_path);
                if !action.arguments.is_empty() {
                    cmd.args(action.arguments.split_whitespace());
                }
                cmd.spawn()
            }
            ActionType::RunScript => {
                // Run script through cmd with proper quoting
                let quoted_path = format!("\"{}\"", action.executable_path);
                Command::new("cmd")
                    .args(["/C", &quoted_path])
                    .args(action.arguments.split_whitespace())
                    .spawn()
            }
            ActionType::SystemCommand => {
                // Run system command through cmd
                Command::new("cmd")
                    .args(["/C", &action.executable_path])
                    .args(action.arguments.split_whitespace())
                    .spawn()
            }
            ActionType::Hotkey => {
                log::info!("Hotkey action not yet implemented");
                return;
            }
        };

        // Log the result
        if let Ok(mut config) = self.config_manager.lock() {
            match result {
                Ok(_) => {
                    config.add_log(
                        LogEntryLevel::Success,
                        format!("Action executed: {}", action.executable_path),
                        Some(device_id.to_string()),
                    );
                }
                Err(e) => {
                    config.add_log(
                        LogEntryLevel::Error,
                        format!("Action failed: {}", e),
                        Some(device_id.to_string()),
                    );
                }
            }
        }
    }
}
