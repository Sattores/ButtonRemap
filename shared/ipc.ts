// ============================================
// USB Configurator - IPC Commands Interface
// Defines the contract between React frontend and Tauri/Rust backend
// ============================================

import type {
  HidDevice,
  DeviceBinding,
  AppSettings,
  LogEntry,
  IpcResult,
  MonitoringState,
} from "./types";

// ============================================
// IPC Command Names (Tauri invoke keys)
// ============================================

export const IPC_COMMANDS = {
  // Device Management
  LIST_DEVICES: "list_devices",
  REFRESH_DEVICES: "refresh_devices",
  GET_DEVICE_INFO: "get_device_info",
  
  // Monitoring
  START_MONITORING: "start_monitoring",
  STOP_MONITORING: "stop_monitoring",
  GET_MONITORING_STATE: "get_monitoring_state",
  
  // Configuration
  GET_ALL_BINDINGS: "get_all_bindings",
  GET_BINDING: "get_binding",
  SAVE_BINDING: "save_binding",
  DELETE_BINDING: "delete_binding",
  
  // Settings
  GET_SETTINGS: "get_settings",
  SAVE_SETTINGS: "save_settings",
  
  // Actions
  TEST_ACTION: "test_action",
  EXECUTE_ACTION: "execute_action",
  
  // Logs
  GET_LOGS: "get_logs",
  CLEAR_LOGS: "clear_logs",
  EXPORT_LOGS: "export_logs",
  
  // System
  OPEN_FILE_DIALOG: "open_file_dialog",
  GET_APP_VERSION: "get_app_version",
  MINIMIZE_TO_TRAY: "minimize_to_tray",
  QUIT_APP: "quit_app",
} as const;

// ============================================
// IPC Event Names (Tauri listen keys)
// ============================================

export const IPC_EVENTS = {
  DEVICE_CONNECTED: "device-connected",
  DEVICE_DISCONNECTED: "device-disconnected",
  BUTTON_PRESSED: "button-pressed",
  BUTTON_RELEASED: "button-released",
  MONITORING_DETECTED: "monitoring-detected",
  LOG_ENTRY: "log-entry",
  CONFIG_CHANGED: "config-changed",
} as const;

// ============================================
// IPC Interface (TypeScript types for Tauri invoke)
// This mirrors what the Rust backend will implement
// ============================================

export interface TauriCommands {
  // Device Management
  [IPC_COMMANDS.LIST_DEVICES]: () => Promise<IpcResult<HidDevice[]>>;
  [IPC_COMMANDS.REFRESH_DEVICES]: () => Promise<IpcResult<HidDevice[]>>;
  [IPC_COMMANDS.GET_DEVICE_INFO]: (deviceId: string) => Promise<IpcResult<HidDevice>>;
  
  // Monitoring
  [IPC_COMMANDS.START_MONITORING]: () => Promise<IpcResult<void>>;
  [IPC_COMMANDS.STOP_MONITORING]: () => Promise<IpcResult<void>>;
  [IPC_COMMANDS.GET_MONITORING_STATE]: () => Promise<IpcResult<MonitoringState>>;
  
  // Configuration
  [IPC_COMMANDS.GET_ALL_BINDINGS]: () => Promise<IpcResult<DeviceBinding[]>>;
  [IPC_COMMANDS.GET_BINDING]: (deviceId: string) => Promise<IpcResult<DeviceBinding | null>>;
  [IPC_COMMANDS.SAVE_BINDING]: (binding: DeviceBinding) => Promise<IpcResult<DeviceBinding>>;
  [IPC_COMMANDS.DELETE_BINDING]: (bindingId: string) => Promise<IpcResult<void>>;
  
  // Settings
  [IPC_COMMANDS.GET_SETTINGS]: () => Promise<IpcResult<AppSettings>>;
  [IPC_COMMANDS.SAVE_SETTINGS]: (settings: AppSettings) => Promise<IpcResult<AppSettings>>;
  
  // Actions
  [IPC_COMMANDS.TEST_ACTION]: (binding: DeviceBinding) => Promise<IpcResult<void>>;
  [IPC_COMMANDS.EXECUTE_ACTION]: (bindingId: string) => Promise<IpcResult<void>>;
  
  // Logs
  [IPC_COMMANDS.GET_LOGS]: (limit?: number) => Promise<IpcResult<LogEntry[]>>;
  [IPC_COMMANDS.CLEAR_LOGS]: () => Promise<IpcResult<void>>;
  [IPC_COMMANDS.EXPORT_LOGS]: (filePath: string) => Promise<IpcResult<string>>;
  
  // System
  [IPC_COMMANDS.OPEN_FILE_DIALOG]: (filters?: string[]) => Promise<IpcResult<string | null>>;
  [IPC_COMMANDS.GET_APP_VERSION]: () => Promise<IpcResult<string>>;
  [IPC_COMMANDS.MINIMIZE_TO_TRAY]: () => Promise<IpcResult<void>>;
  [IPC_COMMANDS.QUIT_APP]: () => Promise<IpcResult<void>>;
}
