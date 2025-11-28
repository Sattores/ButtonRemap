// Type declarations for Tauri API
// These modules are only available when running in Tauri environment
// In development/web mode, the code falls back to mock implementations

declare module "@tauri-apps/api/tauri" {
  export function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T>;
}

declare module "@tauri-apps/api/dialog" {
  export interface OpenDialogOptions {
    multiple?: boolean;
    filters?: Array<{ name: string; extensions: string[] }>;
    defaultPath?: string;
    directory?: boolean;
    title?: string;
  }
  export function open(options?: OpenDialogOptions): Promise<string | string[] | null>;
  export function save(options?: OpenDialogOptions): Promise<string | null>;
}

declare module "@tauri-apps/api/app" {
  export function getVersion(): Promise<string>;
  export function getName(): Promise<string>;
  export function getTauriVersion(): Promise<string>;
}

declare module "@tauri-apps/api/event" {
  export interface Event<T> {
    event: string;
    windowLabel: string;
    id: number;
    payload: T;
  }
  export type EventCallback<T> = (event: Event<T>) => void;
  export type UnlistenFn = () => void;
  export function listen<T>(event: string, handler: EventCallback<T>): Promise<UnlistenFn>;
  export function emit(event: string, payload?: unknown): Promise<void>;
}

// Extend Window interface for Tauri detection
interface Window {
  __TAURI__?: {
    invoke: <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
  };
}
