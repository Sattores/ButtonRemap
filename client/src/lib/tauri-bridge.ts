// ============================================
// USB Configurator - Tauri Bridge
// Abstraction layer between React and Tauri backend
// In development: uses mock data
// In production: uses real Tauri invoke() calls
// ============================================

import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type {
  HidDevice,
  DeviceBinding,
  AppSettings,
  LogEntry,
  IpcResult,
  MonitoringState,
  ActionConfig,
} from "../../../shared/types";
import { IPC_COMMANDS, IPC_EVENTS } from "../../../shared/ipc";

// Check if running in Tauri environment
const isTauri = (): boolean => {
  return typeof window !== "undefined" && ("__TAURI_INTERNALS__" in window || "__TAURI__" in window);
};

// Helper to invoke Tauri commands (only called in Tauri environment)
const tauriInvoke = async <T>(cmd: string, args?: Record<string, unknown>): Promise<T> => {
  return invoke<T>(cmd, args);
};

// Mock data for development
const MOCK_DEVICES: HidDevice[] = [
  {
    id: "dev-1",
    name: "Macro Pad RGB",
    vendorId: "1A2B",
    productId: "3C4D",
    interfaceNumber: 0,
    totalInterfaces: 1,
    status: "configured",
    manufacturer: "Generic",
  },
  {
    id: "dev-2",
    name: "Generic USB Button",
    vendorId: "05F3",
    productId: "0001",
    interfaceNumber: 0,
    totalInterfaces: 2,
    status: "connected",
    manufacturer: "PI Engineering",
  },
  {
    id: "dev-3",
    name: "Stream Deck Mini",
    vendorId: "0FD9",
    productId: "0063",
    interfaceNumber: 1,
    totalInterfaces: 2,
    status: "disconnected",
    manufacturer: "Elgato",
  },
];

// In-memory storage for development
let mockBindings: DeviceBinding[] = [
  {
    id: "bind-1",
    deviceId: "dev-1",
    vendorId: "1A2B",
    productId: "3C4D",
    triggerType: "single-press",
    action: {
      type: "launch-app",
      executablePath: "C:\\Program Files\\Tools\\MyScript.bat",
      arguments: "--silent",
    },
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

let mockLogs: LogEntry[] = [
  {
    id: "log-1",
    timestamp: new Date(Date.now() - 10000).toISOString(),
    level: "info",
    message: "Application started",
    source: "System",
  },
  {
    id: "log-2",
    timestamp: new Date(Date.now() - 5000).toISOString(),
    level: "success",
    message: "HID Service initialized",
    source: "HID",
  },
];

let mockSettings: AppSettings = {
  startMinimized: false,
  startWithWindows: false,
  showInTray: true,
  theme: "system",
  logLevel: "info",
  maxLogEntries: 100,
};

let monitoringState: MonitoringState = {
  isActive: false,
  detectedDevice: undefined,
};

// Event listeners storage
type EventCallback = (data: unknown) => void;
const eventListeners: Map<string, Set<EventCallback>> = new Map();

// ============================================
// Tauri Bridge API
// ============================================

export const TauriBridge = {
  // --- Device Management ---
  
  async listDevices(): Promise<IpcResult<HidDevice[]>> {
    if (isTauri()) {
      return tauriInvoke(IPC_COMMANDS.LIST_DEVICES);
    }
    // Development mock
    return { success: true, data: [...MOCK_DEVICES] };
  },

  async refreshDevices(): Promise<IpcResult<HidDevice[]>> {
    if (isTauri()) {
      return tauriInvoke(IPC_COMMANDS.REFRESH_DEVICES);
    }
    // Simulate refresh delay
    await new Promise((r) => setTimeout(r, 800));
    return { success: true, data: [...MOCK_DEVICES] };
  },

  async getDeviceInfo(deviceId: string): Promise<IpcResult<HidDevice>> {
    if (isTauri()) {
      return tauriInvoke(IPC_COMMANDS.GET_DEVICE_INFO, { deviceId });
    }
    const device = MOCK_DEVICES.find((d) => d.id === deviceId);
    if (device) {
      return { success: true, data: device };
    }
    return { success: false, error: "Device not found" };
  },

  // --- Monitoring ---

  async startMonitoring(): Promise<IpcResult<void>> {
    if (isTauri()) {
      return tauriInvoke(IPC_COMMANDS.START_MONITORING);
    }
    monitoringState.isActive = true;
    
    // Simulate device detection after 2-4 seconds
    setTimeout(() => {
      if (monitoringState.isActive && Math.random() > 0.3) {
        const detected = MOCK_DEVICES[1]; // Generic USB Button
        monitoringState.detectedDevice = detected;
        monitoringState.isActive = false;
        
        // Emit event
        const callbacks = eventListeners.get(IPC_EVENTS.MONITORING_DETECTED);
        callbacks?.forEach((cb) => cb({ device: detected }));
      }
    }, 2000 + Math.random() * 2000);
    
    return { success: true };
  },

  async stopMonitoring(): Promise<IpcResult<void>> {
    if (isTauri()) {
      return tauriInvoke(IPC_COMMANDS.STOP_MONITORING);
    }
    monitoringState.isActive = false;
    monitoringState.detectedDevice = undefined;
    return { success: true };
  },

  async getMonitoringState(): Promise<IpcResult<MonitoringState>> {
    if (isTauri()) {
      return tauriInvoke(IPC_COMMANDS.GET_MONITORING_STATE);
    }
    return { success: true, data: { ...monitoringState } };
  },

  // --- Configuration ---

  async getAllBindings(): Promise<IpcResult<DeviceBinding[]>> {
    if (isTauri()) {
      return tauriInvoke(IPC_COMMANDS.GET_ALL_BINDINGS);
    }
    return { success: true, data: [...mockBindings] };
  },

  async getBinding(deviceId: string): Promise<IpcResult<DeviceBinding | null>> {
    if (isTauri()) {
      return tauriInvoke(IPC_COMMANDS.GET_BINDING, { deviceId });
    }
    const binding = mockBindings.find((b) => b.deviceId === deviceId);
    return { success: true, data: binding || null };
  },

  async saveBinding(binding: Omit<DeviceBinding, "id" | "createdAt" | "updatedAt"> & { id?: string }): Promise<IpcResult<DeviceBinding>> {
    if (isTauri()) {
      return tauriInvoke(IPC_COMMANDS.SAVE_BINDING, { binding });
    }
    
    // Mock save
    await new Promise((r) => setTimeout(r, 500));
    
    const now = new Date().toISOString();
    const existingIndex = mockBindings.findIndex((b) => b.deviceId === binding.deviceId);
    
    const savedBinding: DeviceBinding = {
      ...binding,
      id: binding.id || `bind-${Date.now()}`,
      createdAt: existingIndex >= 0 ? mockBindings[existingIndex].createdAt : now,
      updatedAt: now,
    };
    
    if (existingIndex >= 0) {
      mockBindings[existingIndex] = savedBinding;
    } else {
      mockBindings.push(savedBinding);
    }
    
    // Update device status
    const deviceIndex = MOCK_DEVICES.findIndex((d) => d.id === binding.deviceId);
    if (deviceIndex >= 0) {
      MOCK_DEVICES[deviceIndex].status = "configured";
    }
    
    return { success: true, data: savedBinding };
  },

  async deleteBinding(bindingId: string): Promise<IpcResult<void>> {
    if (isTauri()) {
      return tauriInvoke(IPC_COMMANDS.DELETE_BINDING, { bindingId });
    }
    
    const binding = mockBindings.find((b) => b.id === bindingId);
    if (binding) {
      const deviceIndex = MOCK_DEVICES.findIndex((d) => d.id === binding.deviceId);
      if (deviceIndex >= 0) {
        MOCK_DEVICES[deviceIndex].status = "connected";
      }
    }
    
    mockBindings = mockBindings.filter((b) => b.id !== bindingId);
    return { success: true };
  },

  // --- Settings ---

  async getSettings(): Promise<IpcResult<AppSettings>> {
    if (isTauri()) {
      return tauriInvoke(IPC_COMMANDS.GET_SETTINGS);
    }
    return { success: true, data: { ...mockSettings } };
  },

  async saveSettings(settings: AppSettings): Promise<IpcResult<AppSettings>> {
    if (isTauri()) {
      return tauriInvoke(IPC_COMMANDS.SAVE_SETTINGS, { settings });
    }
    mockSettings = { ...settings };
    return { success: true, data: mockSettings };
  },

  // --- Actions ---

  async testAction(action: ActionConfig): Promise<IpcResult<void>> {
    if (isTauri()) {
      return tauriInvoke(IPC_COMMANDS.TEST_ACTION, { action });
    }
    // Mock test - just log
    console.log("[Mock] Testing action:", action);
    TauriBridge.addLog("info", `Test: ${action.executablePath} ${action.arguments}`, "Test");
    return { success: true };
  },

  // --- Logs ---

  async getLogs(limit?: number): Promise<IpcResult<LogEntry[]>> {
    if (isTauri()) {
      return tauriInvoke(IPC_COMMANDS.GET_LOGS, { limit });
    }
    const logs = limit ? mockLogs.slice(0, limit) : mockLogs;
    return { success: true, data: logs };
  },

  async clearLogs(): Promise<IpcResult<void>> {
    if (isTauri()) {
      return tauriInvoke(IPC_COMMANDS.CLEAR_LOGS);
    }
    mockLogs = [];
    return { success: true };
  },

  addLog(level: LogEntry["level"], message: string, source?: string): void {
    const entry: LogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString(),
      level,
      message,
      source,
    };
    mockLogs.unshift(entry);
    if (mockLogs.length > 100) {
      mockLogs = mockLogs.slice(0, 100);
    }
    
    // Emit event
    const callbacks = eventListeners.get(IPC_EVENTS.LOG_ENTRY);
    callbacks?.forEach((cb) => cb(entry));
  },

  // --- System ---

  async openFileDialog(_filters?: string[]): Promise<IpcResult<string | null>> {
    if (isTauri()) {
      // In Tauri, we would use dialog API
      return tauriInvoke(IPC_COMMANDS.OPEN_FILE_DIALOG, { filters: _filters });
    }
    // Mock file dialog
    return { success: true, data: "C:\\Program Files\\Example\\app.exe" };
  },

  async getAppVersion(): Promise<IpcResult<string>> {
    if (isTauri()) {
      return tauriInvoke(IPC_COMMANDS.GET_APP_VERSION);
    }
    return { success: true, data: "2.1.0-dev" };
  },

  // --- Event System ---

  on(event: string, callback: EventCallback): () => void {
    if (isTauri()) {
      // In Tauri mode - use actual Tauri event listener
      let unlisten: UnlistenFn | null = null;

      listen(event, (tauriEvent) => {
        console.log(`[TauriBridge] Received Tauri event: ${event}`, tauriEvent.payload);
        callback(tauriEvent.payload);
      }).then(fn => {
        unlisten = fn;
      });

      // Return unsubscribe function
      return () => {
        if (unlisten) {
          unlisten();
        }
      };
    } else {
      // Development mode - use local event system
      if (!eventListeners.has(event)) {
        eventListeners.set(event, new Set());
      }
      eventListeners.get(event)!.add(callback);

      // Return unsubscribe function
      return () => {
        eventListeners.get(event)?.delete(callback);
      };
    }
  },

  emit(event: string, data: unknown): void {
    const callbacks = eventListeners.get(event);
    callbacks?.forEach((cb) => cb(data));
  },
};

export default TauriBridge;
