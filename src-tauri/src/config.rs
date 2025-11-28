use crate::types::{AppSettings, DeviceBinding, LogEntry, LogEntryLevel};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ConfigError {
    #[error("Failed to get config directory")]
    NoConfigDir,
    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),
    #[error("JSON error: {0}")]
    JsonError(#[from] serde_json::Error),
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct ConfigData {
    pub bindings: Vec<DeviceBinding>,
    pub settings: AppSettings,
}

pub struct ConfigManager {
    config_path: PathBuf,
    logs_path: PathBuf,
    data: ConfigData,
    logs: Vec<LogEntry>,
}

impl ConfigManager {
    pub fn new() -> Result<Self, ConfigError> {
        let config_dir = dirs::config_dir()
            .ok_or(ConfigError::NoConfigDir)?
            .join("usb-configurator");
        
        // Ensure config directory exists
        fs::create_dir_all(&config_dir)?;
        
        let config_path = config_dir.join("config.json");
        let logs_path = config_dir.join("logs.json");
        
        // Load existing config or create default
        let data = if config_path.exists() {
            let content = fs::read_to_string(&config_path)?;
            serde_json::from_str(&content).unwrap_or_default()
        } else {
            ConfigData::default()
        };
        
        // Load logs or start fresh
        let logs = if logs_path.exists() {
            let content = fs::read_to_string(&logs_path)?;
            serde_json::from_str(&content).unwrap_or_default()
        } else {
            Vec::new()
        };
        
        Ok(Self {
            config_path,
            logs_path,
            data,
            logs,
        })
    }

    fn save_config(&self) -> Result<(), ConfigError> {
        let content = serde_json::to_string_pretty(&self.data)?;
        fs::write(&self.config_path, content)?;
        Ok(())
    }

    fn save_logs(&self) -> Result<(), ConfigError> {
        let content = serde_json::to_string_pretty(&self.logs)?;
        fs::write(&self.logs_path, content)?;
        Ok(())
    }

    // --- Bindings ---

    pub fn get_all_bindings(&self) -> Vec<DeviceBinding> {
        self.data.bindings.clone()
    }

    pub fn get_binding(&self, device_id: &str) -> Option<DeviceBinding> {
        self.data.bindings
            .iter()
            .find(|b| b.device_id == device_id)
            .cloned()
    }

    pub fn save_binding(&mut self, binding: DeviceBinding) -> Result<DeviceBinding, ConfigError> {
        // Update existing or add new
        if let Some(pos) = self.data.bindings.iter().position(|b| b.device_id == binding.device_id) {
            self.data.bindings[pos] = binding.clone();
        } else {
            self.data.bindings.push(binding.clone());
        }
        
        self.save_config()?;
        Ok(binding)
    }

    pub fn delete_binding(&mut self, binding_id: &str) -> Result<(), ConfigError> {
        self.data.bindings.retain(|b| b.id != binding_id);
        self.save_config()?;
        Ok(())
    }

    pub fn get_binding_by_id(&self, binding_id: &str) -> Option<DeviceBinding> {
        self.data.bindings
            .iter()
            .find(|b| b.id == binding_id)
            .cloned()
    }

    // --- Settings ---

    pub fn get_settings(&self) -> AppSettings {
        self.data.settings.clone()
    }

    pub fn save_settings(&mut self, settings: AppSettings) -> Result<AppSettings, ConfigError> {
        self.data.settings = settings.clone();
        self.save_config()?;
        Ok(settings)
    }

    // --- Logs ---

    pub fn get_logs(&self, limit: Option<usize>) -> Vec<LogEntry> {
        let max_entries = self.data.settings.max_log_entries as usize;
        let effective_limit = limit.unwrap_or(max_entries).min(max_entries);
        
        self.logs
            .iter()
            .take(effective_limit)
            .cloned()
            .collect()
    }

    pub fn add_log(&mut self, level: LogEntryLevel, message: String, source: Option<String>) {
        let entry = LogEntry::new(level, message, source);
        self.logs.insert(0, entry);
        
        // Trim to max entries
        let max = self.data.settings.max_log_entries as usize;
        if self.logs.len() > max {
            self.logs.truncate(max);
        }
        
        // Save logs (ignore errors for performance)
        let _ = self.save_logs();
    }

    pub fn clear_logs(&mut self) -> Result<(), ConfigError> {
        self.logs.clear();
        self.save_logs()?;
        Ok(())
    }

    // --- Device state tracking ---

    pub fn get_configured_device_ids(&self) -> Vec<String> {
        self.data.bindings
            .iter()
            .map(|b| b.device_id.clone())
            .collect()
    }
}
