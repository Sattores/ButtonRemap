// ============================================
// USB Configurator - Default Presets
// Pre-configured actions for common use cases
// ============================================

import type { PresetCategory } from "./types";

export const DEFAULT_PRESETS: PresetCategory[] = [
  {
    id: "ai-voice",
    name: "AI & Voice Actions",
    items: [
      {
        id: "whisper-input",
        name: "Voice Input (Whisper)",
        icon: "Mic",
        iconColor: "text-primary",
        action: {
          type: "run-script",
          executablePath: "python",
          arguments: "scripts/whisper_input.py",
        },
      },
      {
        id: "llm-clipboard",
        name: "Ask Selection (LLM)",
        icon: "Sparkles",
        iconColor: "text-amber-500",
        action: {
          type: "run-script",
          executablePath: "scripts/ask_llm.bat",
          arguments: "--clipboard",
        },
      },
      {
        id: "chatgpt-voice",
        name: "Toggle ChatGPT Voice",
        icon: "Bot",
        iconColor: "text-emerald-500",
        action: {
          type: "launch-app",
          executablePath: "C:\\Apps\\ChatGPT\\ChatGPT.exe",
          arguments: "--voice-mode",
        },
      },
      {
        id: "mute-mic",
        name: "Mute Microphone",
        icon: "MicOff",
        iconColor: "text-red-500",
        action: {
          type: "system-command",
          executablePath: "nircmd.exe",
          arguments: "mutesysvolume 2 microphone",
        },
      },
    ],
  },
  {
    id: "productivity",
    name: "Productivity",
    items: [
      {
        id: "screenshot",
        name: "Screenshot Area",
        icon: "Camera",
        iconColor: "text-foreground",
        action: {
          type: "launch-app",
          executablePath: "snippingtool.exe",
          arguments: "/clip",
        },
      },
      {
        id: "terminal",
        name: "Open Terminal",
        icon: "Terminal",
        iconColor: "text-foreground",
        action: {
          type: "launch-app",
          executablePath: "wt.exe",
          arguments: "",
        },
      },
      {
        id: "calculator",
        name: "Calculator",
        icon: "Calculator",
        iconColor: "text-foreground",
        action: {
          type: "launch-app",
          executablePath: "calc.exe",
          arguments: "",
        },
      },
    ],
  },
  {
    id: "hotkeys",
    name: "Hotkeys",
    items: [
      {
        id: "copy",
        name: "Copy (Ctrl+C)",
        icon: "Copy",
        iconColor: "text-foreground",
        action: {
          type: "hotkey",
          executablePath: "Ctrl+C",
          arguments: "",
        },
      },
      {
        id: "paste",
        name: "Paste (Ctrl+V)",
        icon: "Clipboard",
        iconColor: "text-foreground",
        action: {
          type: "hotkey",
          executablePath: "Ctrl+V",
          arguments: "",
        },
      },
      {
        id: "undo",
        name: "Undo (Ctrl+Z)",
        icon: "Undo",
        iconColor: "text-foreground",
        action: {
          type: "hotkey",
          executablePath: "Ctrl+Z",
          arguments: "",
        },
      },
      {
        id: "redo",
        name: "Redo (Ctrl+Y)",
        icon: "Redo",
        iconColor: "text-foreground",
        action: {
          type: "hotkey",
          executablePath: "Ctrl+Y",
          arguments: "",
        },
      },
      {
        id: "select-all",
        name: "Select All (Ctrl+A)",
        icon: "CheckSquare",
        iconColor: "text-foreground",
        action: {
          type: "hotkey",
          executablePath: "Ctrl+A",
          arguments: "",
        },
      },
      {
        id: "save",
        name: "Save (Ctrl+S)",
        icon: "Save",
        iconColor: "text-foreground",
        action: {
          type: "hotkey",
          executablePath: "Ctrl+S",
          arguments: "",
        },
      },
      {
        id: "task-manager",
        name: "Task Manager (Ctrl+Shift+Esc)",
        icon: "Activity",
        iconColor: "text-foreground",
        action: {
          type: "hotkey",
          executablePath: "Ctrl+Shift+Escape",
          arguments: "",
        },
      },
      {
        id: "alt-tab",
        name: "Switch Window (Alt+Tab)",
        icon: "Layers",
        iconColor: "text-foreground",
        action: {
          type: "hotkey",
          executablePath: "Alt+Tab",
          arguments: "",
        },
      },
    ],
  },
  {
    id: "system",
    name: "System Controls",
    items: [
      {
        id: "lock",
        name: "Lock Workstation",
        icon: "Lock",
        iconColor: "text-foreground",
        action: {
          type: "system-command",
          executablePath: "rundll32.exe",
          arguments: "user32.dll,LockWorkStation",
        },
      },
      {
        id: "mute-audio",
        name: "Mute System Audio",
        icon: "VolumeX",
        iconColor: "text-foreground",
        action: {
          type: "system-command",
          executablePath: "nircmd.exe",
          arguments: "mutesysvolume 2",
        },
      },
      {
        id: "shutdown",
        name: "Emergency Stop",
        icon: "Power",
        iconColor: "text-red-500",
        action: {
          type: "system-command",
          executablePath: "shutdown.exe",
          arguments: "/s /t 0",
        },
      },
    ],
  },
];
