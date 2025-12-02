use crate::config::ConfigManager;
use crate::rawinput::RawInputMonitor;
use crate::types::{ActionConfig, ActionType, LogEntryLevel};
use std::process::Command;
use std::sync::{Arc, Mutex};
use std::thread;

/// Parse arguments string respecting quoted sections
/// Examples:
///   `arg1 arg2` -> ["arg1", "arg2"]
///   `"path with spaces" arg2` -> ["path with spaces", "arg2"]
///   `arg1 "quoted arg"` -> ["arg1", "quoted arg"]
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_simple_args() {
        let result = parse_arguments("arg1 arg2 arg3");
        assert_eq!(result, vec!["arg1", "arg2", "arg3"]);
    }

    #[test]
    fn test_parse_quoted_path() {
        let result = parse_arguments("\"C:\\Program Files\\App\\app.exe\" --flag");
        assert_eq!(result, vec!["C:\\Program Files\\App\\app.exe", "--flag"]);
    }

    #[test]
    fn test_parse_mixed_args() {
        let result = parse_arguments("normal \"quoted arg\" another");
        assert_eq!(result, vec!["normal", "quoted arg", "another"]);
    }

    #[test]
    fn test_parse_empty() {
        let result = parse_arguments("");
        assert!(result.is_empty());
    }

    #[test]
    fn test_parse_multiple_spaces() {
        let result = parse_arguments("arg1    arg2");
        assert_eq!(result, vec!["arg1", "arg2"]);
    }
}

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
            if let Ok(mut config) = self.config_manager.lock() {
                // Log that we detected input
                config.add_log(
                    LogEntryLevel::Info,
                    format!("Button pressed on device {}", device_id),
                    Some(device_id.clone()),
                );

                if let Some(binding) = config.get_binding(&device_id) {
                    if binding.enabled {
                        let action = binding.action.clone();
                        let action_desc = format!("{}: {}",
                            match action.r#type {
                                ActionType::LaunchApp => "Launch App",
                                ActionType::RunScript => "Run Script",
                                ActionType::SystemCommand => "System Command",
                                ActionType::Hotkey => "Hotkey",
                            },
                            action.executable_path
                        );

                        // Log that we're about to execute
                        config.add_log(
                            LogEntryLevel::Info,
                            format!("Executing: {}", action_desc),
                            Some(device_id.clone()),
                        );

                        drop(config); // Release lock before executing
                        self.execute_action(&action, &device_id);
                    } else {
                        config.add_log(
                            LogEntryLevel::Warn,
                            format!("Binding disabled for device {}", device_id),
                            Some(device_id.clone()),
                        );
                    }
                } else {
                    config.add_log(
                        LogEntryLevel::Warn,
                        format!("No binding configured for device {}", device_id),
                        Some(device_id.clone()),
                    );
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
                    cmd.args(parse_arguments(&action.arguments));
                }
                cmd.spawn()
            }
            ActionType::RunScript => {
                // Run script through cmd with proper quoting
                let quoted_path = format!("\"{}\"", action.executable_path);
                Command::new("cmd")
                    .args(["/C", &quoted_path])
                    .args(parse_arguments(&action.arguments))
                    .spawn()
            }
            ActionType::SystemCommand => {
                // Run system command through cmd
                Command::new("cmd")
                    .args(["/C", &action.executable_path])
                    .args(parse_arguments(&action.arguments))
                    .spawn()
            }
            ActionType::Hotkey => {
                // Execute hotkey and log result separately (doesn't spawn process)
                match crate::hotkey::execute_hotkey(&action.executable_path) {
                    Ok(_) => {
                        if let Ok(mut config) = self.config_manager.lock() {
                            config.add_log(
                                LogEntryLevel::Success,
                                format!("Hotkey executed: {}", action.executable_path),
                                Some(device_id.to_string()),
                            );
                        }
                    }
                    Err(e) => {
                        if let Ok(mut config) = self.config_manager.lock() {
                            config.add_log(
                                LogEntryLevel::Error,
                                format!("Hotkey failed: {}", e),
                                Some(device_id.to_string()),
                            );
                        }
                    }
                }
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
