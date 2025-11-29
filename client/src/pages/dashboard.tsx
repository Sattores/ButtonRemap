import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import appIcon from "@/assets/icon-header.png";
import { 
  Search, 
  RefreshCw, 
  Usb, 
  Settings, 
  Terminal, 
  Play, 
  Save, 
  Copy, 
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  Zap,
  Keyboard,
  MousePointerClick,
  Clock,
  Calculator,
  FileText,
  Lock,
  VolumeX,
  Power,
  Globe,
  Loader2,
  Eraser,
  Download,
  Pause,
  PlayCircle,
  MoreHorizontal,
  Unlink,
  Mic,
  MicOff,
  Sparkles,
  MessageSquare,
  Camera,
  Bot
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";

import bgImage from "@assets/generated_images/minimalist_abstract_geometric_shapes_in_soft_white_and_light_gray.png";

import TauriBridge from "@/lib/tauri-bridge";
import type { HidDevice, LogEntry, TriggerType, ActionConfig, DeviceBinding } from "../../../shared/types";
import { DEFAULT_PRESETS } from "../../../shared/presets";
import { IPC_EVENTS } from "../../../shared/ipc";

// Icon mapping for presets
const ICON_MAP: Record<string, React.ReactNode> = {
  Mic: <Mic className="w-4 h-4 text-primary" />,
  Sparkles: <Sparkles className="w-4 h-4 text-amber-500" />,
  Bot: <Bot className="w-4 h-4 text-emerald-500" />,
  MicOff: <MicOff className="w-4 h-4 text-red-500" />,
  Camera: <Camera className="w-4 h-4" />,
  Terminal: <Terminal className="w-4 h-4" />,
  Calculator: <Calculator className="w-4 h-4" />,
  Lock: <Lock className="w-4 h-4" />,
  VolumeX: <VolumeX className="w-4 h-4" />,
  Power: <Power className="w-4 h-4 text-red-500" />,
};

// Local UI state for config form
interface ConfigForm {
  appPath: string;
  appArgs: string;
  triggerType: TriggerType;
}

export default function Dashboard() {
  // State
  const [devices, setDevices] = useState<HidDevice[]>([]);
  const [bindings, setBindings] = useState<DeviceBinding[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [config, setConfig] = useState<ConfigForm>({
    appPath: "",
    appArgs: "",
    triggerType: "single-press",
  });
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const { toast } = useToast();

  const selectedDevice = devices.find(d => d.id === selectedDeviceId);

  const filteredDevices = devices
    .filter(device =>
      device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.vendorId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.productId.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      // Selected device always on top
      if (a.id === selectedDeviceId) return -1;
      if (b.id === selectedDeviceId) return 1;
      // Rest sorted alphabetically by name
      return a.name.localeCompare(b.name);
    });

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [devicesResult, bindingsResult, logsResult] = await Promise.all([
          TauriBridge.listDevices(),
          TauriBridge.getAllBindings(),
          TauriBridge.getLogs(50),
        ]);

        if (devicesResult.success && devicesResult.data) {
          setDevices(devicesResult.data);
        }
        if (bindingsResult.success && bindingsResult.data) {
          setBindings(bindingsResult.data);
        }
        if (logsResult.success && logsResult.data) {
          setLogs(logsResult.data);
        }
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();

    // Subscribe to log events
    const unsubscribe = TauriBridge.on(IPC_EVENTS.LOG_ENTRY, (entry: LogEntry) => {
      setLogs(prev => [entry, ...prev].slice(0, 50));
    });

    // Subscribe to monitoring detection
    const unsubMonitor = TauriBridge.on(IPC_EVENTS.MONITORING_DETECTED, (data: { device: HidDevice }) => {
      console.log("📥 [Frontend] Received monitoring-detected event:", data);
      setIsMonitoring(false);

      console.log(`🔍 [Frontend] Looking for device ${data.device.id} in list of ${devices.length} devices`);

      // Move detected device to the top of the list
      setDevices(prev => {
        const detectedIndex = prev.findIndex(d => d.id === data.device.id);
        console.log(`🔍 [Frontend] Device index in list: ${detectedIndex}`);

        if (detectedIndex !== -1) {
          // Device found - move it to top
          const newDevices = [...prev];
          const [detectedDevice] = newDevices.splice(detectedIndex, 1);
          console.log("✅ [Frontend] Moved device to top of list");
          return [detectedDevice, ...newDevices];
        } else {
          console.log("⚠️ [Frontend] Device not found in list - adding it");
          // Device not in list - add it at the top
          return [data.device, ...prev];
        }
      });

      // Select the detected device
      console.log(`📌 [Frontend] Selecting device ${data.device.id}`);
      setTimeout(() => handleSelectDevice(data.device.id), 0);

      addLog("success", `Device found: ${data.device.name} (${data.device.vendorId}:${data.device.productId}, Interface ${data.device.interfaceNumber})`, "Monitor");
      toast({ title: "Device Detected!", description: `${data.device.name} (${data.device.vendorId}:${data.device.productId})` });
    });

    return () => {
      unsubscribe();
      unsubMonitor();
    };
  }, []);

  // --- Handlers ---

  const addLog = useCallback((level: LogEntry["level"], message: string, source?: string) => {
    TauriBridge.addLog(level, message, source);
  }, []);

  const handleRefresh = async () => {
    addLog("info", "Refreshing device list...", "System");
    
    const result = await TauriBridge.refreshDevices();
    
    if (result.success && result.data) {
      setDevices(result.data);
      addLog("success", `Found ${result.data.length} HID devices`, "HID");
      toast({ title: "Refreshed", description: "Device list updated" });
    } else {
      addLog("error", "Failed to refresh devices", "HID");
      toast({ title: "Error", description: "Failed to refresh devices", variant: "destructive" });
    }
  };

  const toggleMonitoring = async () => {
    if (!isMonitoring) {
      setIsMonitoring(true);
      addLog("info", "Started 'Find by Press' monitoring", "HID");
      await TauriBridge.startMonitoring();
    } else {
      setIsMonitoring(false);
      addLog("info", "Stopped monitoring", "HID");
      await TauriBridge.stopMonitoring();
    }
  };

  const handleSaveConfig = async () => {
    if (!selectedDevice) return;
    setIsSaving(true);

    try {
      const action: ActionConfig = {
        type: "launch-app",
        executablePath: config.appPath,
        arguments: config.appArgs,
      };

      // Check if binding already exists for this device
      const existingBinding = bindings.find(b => b.deviceId === selectedDevice.id);

      const bindingData: DeviceBinding = existingBinding ? {
        // Update existing binding
        ...existingBinding,
        triggerType: config.triggerType,
        action,
        updatedAt: new Date().toISOString(),
      } : {
        // Create new binding
        id: crypto.randomUUID(),
        deviceId: selectedDevice.id,
        vendorId: selectedDevice.vendorId,
        productId: selectedDevice.productId,
        triggerType: config.triggerType,
        action,
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = await TauriBridge.saveBinding(bindingData);

      if (result.success && result.data) {
        setBindings(prev => {
          const existing = prev.findIndex(b => b.deviceId === selectedDevice.id);
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = result.data!;
            return updated;
          }
          return [...prev, result.data!];
        });

        setDevices(prev => prev.map(d =>
          d.id === selectedDevice.id ? { ...d, status: "configured" } : d
        ));

        addLog("success", `Saved: ${selectedDevice.name} (${selectedDevice.vendorId}:${selectedDevice.productId}, Interface ${selectedDevice.interfaceNumber}) → ${config.appPath}`, "Config");
        toast({ title: "Saved", description: `${selectedDevice.name} configured successfully` });
      }
    } catch (error) {
      addLog("error", "Failed to save configuration", "Config");
      toast({ title: "Error", description: "Failed to save configuration", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectDevice = useCallback(async (id: string) => {
    setSelectedDeviceId(id);
    const device = devices.find(d => d.id === id);
    
    if (!device) return;
    
    // Load existing binding for this device
    const bindingResult = await TauriBridge.getBinding(id);
    
    if (bindingResult.success && bindingResult.data) {
      const binding = bindingResult.data;
      setConfig({
        appPath: binding.action.executablePath,
        appArgs: binding.action.arguments,
        triggerType: binding.triggerType,
      });
    } else {
      setConfig({ appPath: "", appArgs: "", triggerType: "single-press" });
    }
    
    if (device.status === "disconnected") {
      addLog("error", `Could not connect to ${device.name}: Device disconnected`, "HID");
    } else {
      const bindingInfo = bindings.find(b => b.deviceId === id);
      const bindingText = bindingInfo ? ` → ${bindingInfo.action.executablePath}` : " (not configured)";
      addLog("info", `Selected: ${device.name} (${device.vendorId}:${device.productId}, Interface ${device.interfaceNumber})${bindingText}`, "HID");
    }
  }, [devices, bindings, addLog]);

  const handleResetConfig = async () => {
    if (!selectedDevice) return;

    const binding = bindings.find(b => b.deviceId === selectedDevice.id);
    if (binding) {
      await TauriBridge.deleteBinding(binding.id);
      setBindings(prev => prev.filter(b => b.id !== binding.id));
    }

    setConfig({ appPath: "", appArgs: "", triggerType: "single-press" });

    setDevices(prev => prev.map(d =>
      d.id === selectedDeviceId ? { ...d, status: "connected" } : d
    ));

    addLog("info", `Reset: ${selectedDevice.name} (${selectedDevice.vendorId}:${selectedDevice.productId}, Interface ${selectedDevice.interfaceNumber}) configuration cleared`, "Config");
    toast({ title: "Reset", description: `${selectedDevice.name} configuration cleared` });

    // Clear device selection
    setSelectedDeviceId(null);
  };

  const applyPreset = (preset: typeof DEFAULT_PRESETS[0]["items"][0]) => {
    if (selectedDevice?.status === "disconnected") return;
    
    setConfig(prev => ({
      ...prev,
      appPath: preset.action.executablePath,
      appArgs: preset.action.arguments,
    }));
    toast({ title: "Preset Applied", description: `${preset.name} settings loaded` });
  };

  const handleTestAction = async () => {
    if (!config.appPath) return;
    
    await TauriBridge.testAction({
      type: "launch-app",
      executablePath: config.appPath,
      arguments: config.appArgs,
    });
    
    addLog("info", "Test trigger sent", "Test");
  };

  const handleClearLogs = async () => {
    await TauriBridge.clearLogs();
    setLogs([]);
  };

  const handleExportLogs = () => {
    const text = logs.map(l => `[${l.timestamp}] ${l.level.toUpperCase()}: ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: "Logs copied to clipboard" });
  };

  const handleSaveLogs = () => {
    toast({ title: "Logs Saved", description: "Saved to logs.txt" });
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden font-sans text-foreground">
      
      {/* Sidebar */}
      <div className="w-80 border-r border-sidebar-border bg-sidebar flex flex-col shadow-xl z-20">
        <div className="p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            {/* App Icon based on Empty State Design */}
            <div className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-tr from-slate-100 to-slate-200 flex items-center justify-center shadow-sm border border-slate-200/50 relative overflow-hidden">
                <div className="absolute inset-0 rounded-full border border-slate-300/30 animate-[spin_10s_linear_infinite]" />
                <div className="w-7 h-7 rounded-full bg-white shadow-sm flex items-center justify-center relative z-10">
                    <img src={appIcon} className="w-5 h-5" alt="App Icon" />
                </div>
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight tracking-tight">USB Configurator</h1>
              <p className="text-xs text-muted-foreground font-medium">v2.1.0 PRO</p>
            </div>
          </div>
          
          {/* Search & Refresh */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search devices..." 
                className="pl-9 bg-background/50" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search-devices"
              />
            </div>
            <div className="flex gap-2">
                <Button 
                variant="default"
                size="sm" 
                className={`
                  flex-1 transition-all duration-300 shadow-md hover:shadow-lg border-0
                  ${isMonitoring 
                    ? "bg-amber-500 hover:bg-amber-600 text-white animate-pulse ring-2 ring-amber-200" 
                    : "bg-gradient-to-r from-violet-600 via-primary to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white"
                  }
                `}
                onClick={toggleMonitoring}
                data-testid="button-find-device"
                >
                {isMonitoring ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Zap className="w-3.5 h-3.5 mr-2 fill-white/20" />}
                {isMonitoring ? "Detecting..." : "Find Button"}
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground" onClick={handleRefresh} data-testid="button-refresh-devices">
                    <RefreshCw className="w-4 h-4" />
                </Button>
            </div>
          </div>
        </div>

        <Separator className="opacity-50" />

        <div className="flex-1 px-4 py-4 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
          <div className="space-y-1">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">Detected Devices</h3>
            {filteredDevices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <p>No devices found</p>
              </div>
            ) : (
              filteredDevices.map(device => (
                <motion.div
                  key={device.id}
                  layoutId={`device-${device.id}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => handleSelectDevice(device.id)}
                  data-testid={`device-item-${device.id}`}
                >
                  <div 
                    className={`
                      group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 border
                      ${selectedDeviceId === device.id 
                        ? "bg-sidebar-primary/10 border-sidebar-primary/20 shadow-sm" 
                        : "bg-transparent border-transparent hover:bg-sidebar-accent hover:border-sidebar-border"
                      }
                      ${device.status === 'disconnected' ? 'opacity-60 grayscale' : ''}
                    `}
                  >
                    <div className={`
                      w-2 h-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.2)] transition-colors
                      ${device.status === "configured" ? "bg-green-500 shadow-green-500/40" : 
                        device.status === "connected" ? "bg-amber-500 shadow-amber-500/40" : "bg-slate-300 shadow-none"}
                    `} />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className={`text-sm font-medium truncate ${selectedDeviceId === device.id ? "text-primary" : "text-foreground"}`}>
                          {device.name}
                        </span>
                        {device.status === "configured" && (
                          <CheckCircle2 className="w-3 h-3 text-green-500 ml-2" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
                        <span className="bg-sidebar-accent px-1 rounded text-foreground/70">{device.vendorId}:{device.productId}</span>
                        {device.status === 'disconnected' && <span className="text-destructive font-semibold">OFFLINE</span>}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        <div className="p-4 border-t border-sidebar-border text-xs text-center text-muted-foreground">
          <p>System Ready • {devices.length} devices</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative bg-slate-50/50">
        {/* Background Pattern */}
        <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
             <img src={bgImage} className="w-full h-full object-cover" alt="bg" />
             <div className="absolute inset-0 bg-gradient-to-br from-background/80 via-background/90 to-background/50 backdrop-blur-[2px]" />
        </div>

        {/* Monitoring Overlay */}
        <AnimatePresence>
            {isMonitoring && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center text-center"
                >
                    <div className="bg-card border border-border p-8 rounded-2xl shadow-2xl max-w-md w-full mx-4 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent animate-shimmer" />
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                            <Zap className="w-8 h-8 text-primary" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Press any USB Button...</h3>
                        <p className="text-muted-foreground mb-6">
                            We are listening for input signals. Press the hardware button you want to configure.
                        </p>
                        <Button variant="outline" onClick={toggleMonitoring} data-testid="button-cancel-monitoring">Cancel Detection</Button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

        <div className="relative z-10 flex-1 flex flex-col p-8 overflow-hidden">
          <AnimatePresence mode="wait">
            {selectedDevice ? (
              <motion.div 
                key="config-panel"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col h-full max-w-5xl mx-auto w-full gap-6"
              >
                {/* Header Card */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                        <motion.h2 
                        initial={{ opacity: 0, x: -10 }} 
                        animate={{ opacity: 1, x: 0 }}
                        className="text-3xl font-bold tracking-tight text-foreground"
                        data-testid="text-device-name"
                        >
                        {selectedDevice.name}
                        </motion.h2>
                        {selectedDevice.status === 'disconnected' && (
                            <Badge variant="destructive" className="animate-pulse">DISCONNECTED</Badge>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="font-mono text-xs bg-background/50 backdrop-blur">
                        VID: {selectedDevice.vendorId}
                      </Badge>
                      <Badge variant="outline" className="font-mono text-xs bg-background/50 backdrop-blur">
                        PID: {selectedDevice.productId}
                      </Badge>
                      <span className="text-xs text-muted-foreground ml-2">Connected via USB HID</span>
                    </div>
                  </div>
                </div>

                {selectedDevice.status === 'disconnected' ? (
                    <div className="flex-1 flex flex-col items-center justify-center bg-destructive/5 border border-destructive/20 rounded-xl border-dashed">
                        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                            <Usb className="w-8 h-8 text-destructive" />
                        </div>
                        <h3 className="text-lg font-bold text-destructive">Device Disconnected</h3>
                        <p className="text-muted-foreground max-w-sm text-center mt-2">
                            Please reconnect the device to edit its configuration. Check the USB cable or try a different port.
                        </p>
                    </div>
                ) : (
                    /* Configuration Form - Centered Single Column */
                    <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col gap-6">
                        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-md h-full flex flex-col">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg flex items-center gap-2">
                            <Settings className="w-5 h-5 text-primary" />
                            Configuration
                            </CardTitle>
                            <CardDescription>Setup the action for this button</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 flex-1">
                            
                            {/* Quick Presets Dropdown */}
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quick Preset</Label>
                                <Select onValueChange={(val) => {
                                    const allPresets = DEFAULT_PRESETS.flatMap(p => p.items);
                                    const selected = allPresets.find(p => p.id === val);
                                    if (selected) applyPreset(selected);
                                }}>
                                    <SelectTrigger className="h-12 bg-secondary/30 border-border/50" data-testid="select-preset">
                                        <SelectValue placeholder="Select a preset..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {DEFAULT_PRESETS.map((category, i) => (
                                            <React.Fragment key={category.id}>
                                                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{category.name}</div>
                                                {category.items.map(item => (
                                                    <SelectItem key={item.id} value={item.id}>
                                                        <div className="flex items-center gap-2">
                                                            {ICON_MAP[item.icon] || <Settings className="w-4 h-4" />}
                                                            <span>{item.name}</span>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                                {i < DEFAULT_PRESETS.length - 1 && <Separator className="my-1" />}
                                            </React.Fragment>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* App Path */}
                            <div className="space-y-1.5">
                            <Label htmlFor="app-path" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Application Path</Label>
                            <div className="flex gap-2">
                                <Input 
                                id="app-path" 
                                placeholder="C:\Path\To\Application.exe" 
                                value={config.appPath}
                                onChange={(e) => setConfig({...config, appPath: e.target.value})}
                                className="font-mono text-sm bg-background/50 h-10"
                                data-testid="input-app-path"
                                />
                                <Button 
                                  variant="secondary" 
                                  size="icon" 
                                  className="h-10 w-10 shrink-0" 
                                  data-testid="button-browse-file"
                                  onClick={async () => {
                                    const result = await TauriBridge.openFileDialog(["exe", "bat", "cmd", "ps1", "py"]);
                                    if (result.success && result.data) {
                                      setConfig(prev => ({ ...prev, appPath: result.data! }));
                                      toast({ title: "File Selected", description: result.data });
                                    }
                                  }}
                                >
                                    <MoreHorizontal className="w-4 h-4" />
                                </Button>
                            </div>
                            </div>

                            {/* Arguments */}
                            <div className="space-y-1.5">
                            <Label htmlFor="app-args" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Arguments</Label>
                            <Input 
                                id="app-args" 
                                placeholder="e.g. --fullscreen --silent" 
                                value={config.appArgs}
                                onChange={(e) => setConfig({...config, appArgs: e.target.value})}
                                className="font-mono text-sm bg-background/50 h-10"
                                data-testid="input-app-args"
                            />
                            </div>

                            <Separator className="my-2" />

                            {/* Trigger Type */}
                            <div className="space-y-3">
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Trigger Type</Label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                { id: "single-press", label: "Single Press", icon: MousePointerClick, desc: "Standard click" },
                                { id: "double-press", label: "Double Press", icon: Copy, desc: "Quick double click" },
                                { id: "long-press", label: "Long Press", icon: Clock, desc: "Hold > 500ms" },
                                ].map((type) => (
                                <div
                                    key={type.id}
                                    onClick={() => setConfig({...config, triggerType: type.id as TriggerType})}
                                    className={`
                                    cursor-pointer rounded-xl border-2 p-2 flex flex-col items-center gap-2 transition-all relative overflow-hidden
                                    ${config.triggerType === type.id 
                                        ? "border-primary bg-primary/5 text-primary" 
                                        : "border-transparent bg-secondary/50 hover:bg-secondary hover:scale-[1.02]"
                                    }
                                    `}
                                    data-testid={`trigger-${type.id}`}
                                >
                                    {config.triggerType === type.id && (
                                        <div className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full" />
                                    )}
                                    <type.icon className="w-5 h-5 mb-1" />
                                    <div className="text-center">
                                        <div className="text-sm font-bold leading-none mb-1">{type.label}</div>
                                    </div>
                                </div>
                                ))}
                            </div>
                            </div>
                            
                            <div className="flex-1" />
                            
                            {/* Footer Actions */}
                            <div className="flex items-center justify-between pt-2">
                                <div className="flex items-center gap-2">
                                    {selectedDevice && bindings.some(b => b.deviceId === selectedDevice.id) && (
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button variant="ghost" size="sm" onClick={handleResetConfig} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10" data-testid="button-reset-mapping">
                                                    <Unlink className="w-4 h-4 mr-2" />
                                                    Reset Mapping
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>Unbind current configuration</TooltipContent>
                                        </Tooltip>
                                    )}
                                </div>
                                <div className="flex items-center gap-3">
                                    <Button variant="ghost" onClick={handleTestAction} className="text-muted-foreground hover:text-primary" data-testid="button-test-action">
                                        <PlayCircle className="w-4 h-4 mr-2" /> Test Action
                                    </Button>
                                    <Button onClick={handleSaveConfig} disabled={isSaving} className="min-w-[140px] shadow-lg shadow-primary/20 hover:shadow-primary/30" data-testid="button-save-config">
                                        {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                        {isSaving ? "Saving..." : "Save Config"}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                        </Card>
                    </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="empty-state"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col h-full max-w-5xl mx-auto w-full gap-6"
              >
                {/* Header placeholder */}
                <div className="flex items-center justify-between opacity-50">
                  <div>
                    <h2 className="text-3xl font-bold tracking-tight text-muted-foreground">
                      No Device Selected
                    </h2>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="font-mono text-xs">VID: ----</Badge>
                      <Badge variant="outline" className="font-mono text-xs">PID: ----</Badge>
                    </div>
                  </div>
                </div>

                {/* Disabled form with hint */}
                <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col gap-6 relative">
                  {/* Hint overlay */}
                  <div className="absolute -top-2 left-0 right-0 z-10 flex justify-center">
                    <div className="bg-primary/10 text-primary text-sm font-medium px-4 py-2 rounded-full border border-primary/20 shadow-sm">
                      👆 Select a device from the sidebar or click "Find Button"
                    </div>
                  </div>

                  <Card className="border-none shadow-lg bg-white/60 backdrop-blur-md h-full flex flex-col opacity-60 pointer-events-none select-none">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2 text-muted-foreground">
                        <Settings className="w-5 h-5" />
                        Configuration
                      </CardTitle>
                      <CardDescription>Setup the action for this button</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 flex-1">

                      {/* Quick Presets Dropdown - disabled */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quick Preset</Label>
                        <Select disabled>
                          <SelectTrigger className="h-12 bg-secondary/30 border-border/50">
                            <SelectValue placeholder="Select a preset..." />
                          </SelectTrigger>
                        </Select>
                      </div>

                      {/* App Path - disabled */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Application Path</Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="C:\Path\To\Application.exe"
                            disabled
                            className="font-mono text-sm bg-background/50 h-10"
                          />
                          <Button variant="secondary" size="icon" className="h-10 w-10 shrink-0" disabled>
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Arguments - disabled */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Arguments</Label>
                        <Input
                          placeholder="e.g. --fullscreen --silent"
                          disabled
                          className="font-mono text-sm bg-background/50 h-10"
                        />
                      </div>

                      <Separator className="my-2" />

                      {/* Trigger Type - disabled */}
                      <div className="space-y-3">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Trigger Type</Label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: "single-press", label: "Single Press", icon: MousePointerClick },
                            { id: "double-press", label: "Double Press", icon: Copy },
                            { id: "long-press", label: "Long Press", icon: Clock },
                          ].map((type) => (
                            <div
                              key={type.id}
                              className="rounded-xl border-2 p-2 flex flex-col items-center gap-2 border-transparent bg-secondary/30"
                            >
                              <type.icon className="w-5 h-5 text-muted-foreground" />
                              <div className="text-center">
                                <div className="text-sm font-bold leading-none mb-1 text-muted-foreground">{type.label}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex-1" />

                      {/* Footer Actions - disabled */}
                      <div className="flex items-center justify-end pt-2">
                        <div className="flex items-center gap-3">
                          <Button variant="ghost" disabled className="text-muted-foreground">
                            <PlayCircle className="w-4 h-4 mr-2" /> Test Action
                          </Button>
                          <Button disabled className="min-w-[140px]">
                            <Save className="w-4 h-4 mr-2" />
                            Save Config
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Log Panel - Fixed Bottom */}
        <div className="h-32 bg-white/90 backdrop-blur border-t border-border flex flex-col z-20 shadow-[0_-5px_20px_rgba(0,0,0,0.02)]">
          <div className="px-4 py-2 border-b border-border flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">System Logs</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 border-r border-border/50 pr-3 mr-1">
                 <Label htmlFor="autoscroll" className="text-[10px] text-muted-foreground uppercase font-bold cursor-pointer">Auto-scroll</Label>
                 <Switch id="autoscroll" checked={isAutoScroll} onCheckedChange={setIsAutoScroll} className="scale-75" />
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleSaveLogs} data-testid="button-save-logs">
                    <Download className="w-3 h-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Save to File</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleExportLogs} data-testid="button-copy-logs">
                    <Copy className="w-3 h-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy to Clipboard</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive" onClick={handleClearLogs} data-testid="button-clear-logs">
                    <Eraser className="w-3 h-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Clear Logs</TooltipContent>
              </Tooltip>
            </div>
          </div>
          <div className="flex-1 p-4 font-mono text-xs overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
            <div className="space-y-1">
              {logs.map((log) => (
                <div key={log.id} className="flex gap-3 hover:bg-slate-50 p-0.5 rounded px-2 group">
                  <span className="text-slate-400 select-none shrink-0 group-hover:text-slate-500 transition-colors">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}.
                    <span className="text-[10px]">{new Date(log.timestamp).getMilliseconds().toString().padStart(3, '0')}</span>
                  </span>
                  <span className={`
                    uppercase tracking-wider text-[10px] font-bold w-16 shrink-0
                    ${log.level === 'error' ? 'text-red-500' : log.level === 'success' ? 'text-green-600' : 'text-blue-500'}
                  `}>
                    {log.level}
                  </span>
                  <span className="text-slate-700">{log.message}</span>
                </div>
              ))}
              <div className="h-2" /> {/* Bottom spacer */}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
