// ============================================
// USB Configurator - Shared Types
// These types are used by both React frontend and Tauri/Rust backend
// ============================================

// --- Device Types ---

export type DeviceStatus = "connected" | "disconnected" | "configured";

export interface HidDevice {
  id: string;
  name: string;
  vendorId: string;  // VID in hex format (e.g., "1A2B")
  productId: string; // PID in hex format (e.g., "3C4D")
  interfaceNumber: number;
  totalInterfaces: number;
  status: DeviceStatus;
  path?: string; // OS-specific device path for opening
  serialNumber?: string;
  manufacturer?: string;
}

// --- Configuration Types ---

export type TriggerType = "single-press" | "double-press" | "long-press";

export interface DeviceBinding {
  id: string;
  deviceId: string; // Reference to HidDevice.id
  vendorId: string;
  productId: string;
  triggerType: TriggerType;
  action: ActionConfig;
  enabled: boolean;
  createdAt: string; // ISO date string
  updatedAt: string;
}

export interface ActionConfig {
  type: "launch-app" | "run-script" | "system-command" | "hotkey";
  executablePath: string;
  arguments: string;
  workingDirectory?: string;
  runAsAdmin?: boolean;
}

// --- Preset Types ---

export interface PresetCategory {
  id: string;
  name: string;
  items: PresetItem[];
}

export interface PresetItem {
  id: string;
  name: string;
  icon: string; // Lucide icon name
  iconColor?: string; // Tailwind color class
  action: ActionConfig;
}

// --- App Settings ---

export interface AppSettings {
  startMinimized: boolean;
  startWithWindows: boolean;
  showInTray: boolean;
  theme: "light" | "dark" | "system";
  logLevel: "debug" | "info" | "warn" | "error";
  maxLogEntries: number;
}

// --- Log Types ---

export type LogLevel = "info" | "success" | "error" | "warn" | "debug";

export interface LogEntry {
  id: string;
  timestamp: string; // ISO date string
  level: LogLevel;
  message: string;
  source?: string; // e.g., "HID", "Config", "System"
}

// --- IPC Response Types ---

export interface IpcResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// --- Event Types (Tauri Events) ---

export interface DeviceEvent {
  type: "connected" | "disconnected" | "button-press" | "button-release";
  deviceId: string;
  vendorId: string;
  productId: string;
  timestamp: string;
  rawData?: number[]; // Raw HID report data
}

export interface MonitoringState {
  isActive: boolean;
  detectedDevice?: HidDevice;
}
