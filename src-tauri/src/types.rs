use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HidDevice {
    pub id: String,
    pub name: String,
    pub vendor_id: String,
    pub product_id: String,
    pub interface_number: u8,
    pub total_interfaces: u8,
    pub status: DeviceStatus,
    pub manufacturer: Option<String>,
    pub serial_number: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum DeviceStatus {
    Connected,
    Disconnected,
    Configured,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceBinding {
    pub id: String,
    pub device_id: String,
    pub vendor_id: String,
    pub product_id: String,
    pub trigger_type: TriggerType,
    pub action: ActionConfig,
    pub enabled: bool,
    pub created_at: String,
    pub updated_at: String,
}

impl DeviceBinding {
    pub fn new(
        device_id: String,
        vendor_id: String,
        product_id: String,
        trigger_type: TriggerType,
        action: ActionConfig,
    ) -> Self {
        let now = chrono::Utc::now().to_rfc3339();
        Self {
            id: Uuid::new_v4().to_string(),
            device_id,
            vendor_id,
            product_id,
            trigger_type,
            action,
            enabled: true,
            created_at: now.clone(),
            updated_at: now,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "kebab-case")]
pub enum TriggerType {
    SinglePress,
    DoublePress,
    LongPress,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActionConfig {
    #[serde(rename = "type")]
    pub r#type: ActionType,
    pub executable_path: String,
    pub arguments: String,
    pub working_directory: Option<String>,
    pub run_as_admin: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "kebab-case")]
pub enum ActionType {
    LaunchApp,
    RunScript,
    SystemCommand,
    Hotkey,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub start_minimized: bool,
    pub start_with_windows: bool,
    pub show_in_tray: bool,
    pub theme: Theme,
    pub log_level: LogLevel,
    pub max_log_entries: u32,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            start_minimized: false,
            start_with_windows: false,
            show_in_tray: true,
            theme: Theme::System,
            log_level: LogLevel::Info,
            max_log_entries: 100,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Theme {
    Light,
    Dark,
    System,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum LogLevel {
    Debug,
    Info,
    Warn,
    Error,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LogEntry {
    pub id: String,
    pub timestamp: String,
    pub level: LogEntryLevel,
    pub message: String,
    pub source: Option<String>,
}

impl LogEntry {
    pub fn new(level: LogEntryLevel, message: String, source: Option<String>) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            timestamp: chrono::Utc::now().to_rfc3339(),
            level,
            message,
            source,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum LogEntryLevel {
    Debug,
    Info,
    Success,
    Warn,
    Error,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MonitoringState {
    pub is_active: bool,
    pub detected_device: Option<HidDevice>,
}

impl Default for MonitoringState {
    fn default() -> Self {
        Self {
            is_active: false,
            detected_device: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IpcResult<T> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
}

impl<T> IpcResult<T> {
    pub fn ok(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            error: None,
        }
    }

    pub fn err(error: String) -> Self {
        Self {
            success: false,
            data: None,
            error: Some(error),
        }
    }
}

impl IpcResult<()> {
    pub fn ok_empty() -> Self {
        Self {
            success: true,
            data: Some(()),
            error: None,
        }
    }
}
