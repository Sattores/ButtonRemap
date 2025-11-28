import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";

import bgImage from "@assets/generated_images/minimalist_abstract_geometric_shapes_in_soft_white_and_light_gray.png";

// --- Types ---
interface Device {
  id: string;
  name: string;
  vid: string;
  pid: string;
  interface: number;
  totalInterfaces: number;
  status: "connected" | "disconnected" | "configured";
  lastActive?: Date;
}

interface LogEntry {
  id: string;
  timestamp: Date;
  type: "info" | "success" | "error";
  message: string;
}

interface Config {
  appPath: string;
  appArgs: string;
  actionType: "single-press" | "double-press" | "long-press";
}

// --- Mock Data ---
const MOCK_DEVICES: Device[] = [
  { id: "1", name: "Macro Pad RGB", vid: "1A2B", pid: "3C4D", interface: 0, totalInterfaces: 1, status: "configured", lastActive: new Date() },
  { id: "2", name: "Generic USB Button", vid: "05F3", pid: "0001", interface: 0, totalInterfaces: 2, status: "connected" },
  { id: "3", name: "Stream Deck Mini", vid: "0FD9", pid: "0063", interface: 1, totalInterfaces: 2, status: "disconnected" },
];

const PRESETS = [
  { name: "AI Assistant", icon: <Zap className="w-4 h-4" />, path: "C:\\Program Files\\AI\\assistant.exe", args: "--listen" },
  { name: "Browser", icon: <Search className="w-4 h-4" />, path: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", args: "https://replit.com" },
  { name: "Terminal", icon: <Terminal className="w-4 h-4" />, path: "C:\\Windows\\System32\\cmd.exe", args: "/k echo Hello World" },
];

export default function Dashboard() {
  const [devices, setDevices] = useState<Device[]>(MOCK_DEVICES);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([
    { id: "1", timestamp: new Date(Date.now() - 10000), type: "info", message: "Application started" },
    { id: "2", timestamp: new Date(Date.now() - 5000), type: "success", message: "HID Service initialized" },
  ]);
  const [config, setConfig] = useState<Config>({
    appPath: "",
    appArgs: "",
    actionType: "single-press",
  });
  const { toast } = useToast();

  const selectedDevice = devices.find(d => d.id === selectedDeviceId);

  // --- Handlers ---

  const handleRefresh = () => {
    // Simulate refresh
    addLog("info", "Refreshing device list...");
    setTimeout(() => {
      addLog("success", "Found 3 HID devices");
      toast({ title: "Refreshed", description: "Device list updated" });
    }, 800);
  };

  const toggleMonitoring = () => {
    setIsMonitoring(!isMonitoring);
    if (!isMonitoring) {
      addLog("info", "Started 'Find by Press' monitoring");
      toast({ title: "Monitoring Active", description: "Press any USB button to identify it" });
    } else {
      addLog("info", "Stopped monitoring");
    }
  };

  const addLog = (type: LogEntry["type"], message: string) => {
    setLogs(prev => [{
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      type,
      message
    }, ...prev].slice(0, 50));
  };

  const handleSaveConfig = () => {
    if (!selectedDevice) return;
    addLog("success", `Configuration saved for ${selectedDevice.vid}:${selectedDevice.pid}`);
    toast({ title: "Saved", description: "Button configuration updated successfully" });
    
    setDevices(prev => prev.map(d => 
      d.id === selectedDeviceId ? { ...d, status: "configured" } : d
    ));
  };

  const handleSelectDevice = (id: string) => {
    setSelectedDeviceId(id);
    // Simulate loading config
    const device = devices.find(d => d.id === id);
    if (device?.status === "configured") {
      setConfig({
        appPath: "C:\\Program Files\\Tools\\MyScript.bat",
        appArgs: "--silent",
        actionType: "single-press"
      });
    } else {
      setConfig({ appPath: "", appArgs: "", actionType: "single-press" });
    }
    addLog("info", `Selected device: ${device?.name} (${device?.vid}:${device?.pid})`);
  };

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setConfig(prev => ({
      ...prev,
      appPath: preset.path,
      appArgs: preset.args
    }));
    toast({ title: "Preset Applied", description: `${preset.name} settings loaded` });
  };

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden font-sans text-foreground">
      
      {/* Sidebar */}
      <div className="w-80 border-r border-sidebar-border bg-sidebar flex flex-col shadow-xl z-20">
        <div className="p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Usb className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight tracking-tight">USB Configurator</h1>
              <p className="text-xs text-muted-foreground font-medium">v2.1.0 PRO</p>
            </div>
          </div>

          <div className="flex gap-2 mt-2">
            <Button 
              variant={isMonitoring ? "default" : "outline"} 
              size="sm" 
              className={`flex-1 transition-all duration-300 ${isMonitoring ? "animate-pulse ring-2 ring-primary/20" : ""}`}
              onClick={toggleMonitoring}
            >
              <Search className="w-3.5 h-3.5 mr-2" />
              {isMonitoring ? "Detecting..." : "Find Button"}
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleRefresh}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <Separator className="opacity-50" />

        <div className="flex-1 px-4 py-4 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
          <div className="space-y-1">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">Detected Devices</h3>
            {devices.map(device => (
              <motion.div
                key={device.id}
                layoutId={`device-${device.id}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => handleSelectDevice(device.id)}
              >
                <div 
                  className={`
                    group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 border
                    ${selectedDeviceId === device.id 
                      ? "bg-sidebar-primary/10 border-sidebar-primary/20 shadow-sm" 
                      : "bg-transparent border-transparent hover:bg-sidebar-accent hover:border-sidebar-border"
                    }
                  `}
                >
                  <div className={`
                    w-2 h-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.2)]
                    ${device.status === "configured" ? "bg-green-500 shadow-green-500/40" : 
                      device.status === "connected" ? "bg-amber-500 shadow-amber-500/40" : "bg-slate-300"}
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
                      <span className="bg-sidebar-accent px-1 rounded text-foreground/70">{device.vid}:{device.pid}</span>
                      {device.totalInterfaces > 1 && (
                        <span>IF {device.interface}/{device.totalInterfaces}</span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
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

        <div className="relative z-10 flex-1 flex flex-col p-8 overflow-hidden">
          <AnimatePresence mode="wait">
            {selectedDevice ? (
              <motion.div 
                key="config-panel"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col h-full max-w-4xl mx-auto w-full gap-6"
              >
                {/* Header Card */}
                <div className="flex items-center justify-between">
                  <div>
                    <motion.h2 
                      initial={{ opacity: 0, x: -10 }} 
                      animate={{ opacity: 1, x: 0 }}
                      className="text-3xl font-bold tracking-tight text-foreground"
                    >
                      {selectedDevice.name}
                    </motion.h2>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="font-mono text-xs bg-background/50 backdrop-blur">
                        VID: {selectedDevice.vid}
                      </Badge>
                      <Badge variant="outline" className="font-mono text-xs bg-background/50 backdrop-blur">
                        PID: {selectedDevice.pid}
                      </Badge>
                      <span className="text-xs text-muted-foreground ml-2">Connected via USB HID</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="bg-background/50 backdrop-blur" onClick={() => addLog("info", "Test trigger sent")}>
                      <Play className="w-4 h-4 mr-2 text-blue-500" /> Test
                    </Button>
                    <Button onClick={handleSaveConfig} className="shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-shadow">
                      <Save className="w-4 h-4 mr-2" /> Save Config
                    </Button>
                  </div>
                </div>

                {/* Configuration Form */}
                <div className="grid grid-cols-3 gap-6 flex-1 min-h-0">
                  <div className="col-span-2 space-y-6">
                    <Card className="border-none shadow-lg bg-white/80 backdrop-blur-md">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Settings className="w-5 h-5 text-primary" />
                          Action Settings
                        </CardTitle>
                        <CardDescription>Configure what happens when you press the button.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="space-y-2">
                          <Label htmlFor="app-path">Application Path</Label>
                          <div className="flex gap-2">
                            <Input 
                              id="app-path" 
                              placeholder="C:\Windows\System32\calc.exe" 
                              value={config.appPath}
                              onChange={(e) => setConfig({...config, appPath: e.target.value})}
                              className="font-mono text-sm bg-background/50"
                            />
                            <Button variant="secondary">Browse</Button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="app-args">Arguments (Optional)</Label>
                          <Input 
                            id="app-args" 
                            placeholder="--fullscreen --silent" 
                            value={config.appArgs}
                            onChange={(e) => setConfig({...config, appArgs: e.target.value})}
                            className="font-mono text-sm bg-background/50"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Trigger Type</Label>
                          <div className="grid grid-cols-3 gap-4">
                            {[
                              { id: "single-press", label: "Single Press", icon: MousePointerClick },
                              { id: "double-press", label: "Double Press", icon: Copy },
                              { id: "long-press", label: "Long Press", icon: Clock },
                            ].map((type) => (
                              <div 
                                key={type.id}
                                onClick={() => setConfig({...config, actionType: type.id as any})}
                                className={`
                                  cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center gap-2 transition-all
                                  ${config.actionType === type.id 
                                    ? "border-primary bg-primary/5 text-primary" 
                                    : "border-transparent bg-secondary/50 hover:bg-secondary hover:scale-[1.02]"
                                  }
                                `}
                              >
                                <type.icon className="w-6 h-6" />
                                <span className="text-xs font-medium">{type.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Sidebar / Presets */}
                  <div className="col-span-1 space-y-6">
                    <Card className="border-none shadow-md bg-white/60 backdrop-blur-sm h-full">
                      <CardHeader>
                        <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Quick Presets</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {PRESETS.map((preset) => (
                          <Button
                            key={preset.name}
                            variant="outline"
                            className="w-full justify-start h-auto py-3 border-border/50 hover:border-primary/50 hover:bg-primary/5 group"
                            onClick={() => applyPreset(preset)}
                          >
                            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center mr-3 group-hover:bg-primary group-hover:text-white transition-colors">
                              {preset.icon}
                            </div>
                            <div className="text-left">
                              <div className="font-medium text-sm">{preset.name}</div>
                              <div className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                                {preset.path.split('\\').pop()}
                              </div>
                            </div>
                          </Button>
                        ))}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="empty-state"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground space-y-6"
              >
                <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-slate-100 to-slate-200 flex items-center justify-center shadow-inner mb-4">
                  <div className="w-24 h-24 rounded-full bg-white shadow-xl flex items-center justify-center">
                    <Usb className="w-10 h-10 text-slate-300" />
                  </div>
                </div>
                <div className="max-w-md space-y-2">
                  <h2 className="text-2xl font-bold text-foreground">No Device Selected</h2>
                  <p>Select a USB device from the sidebar or enable "Find by Press" mode to detect your hardware button automatically.</p>
                </div>
                <Button onClick={toggleMonitoring} size="lg" className="rounded-full px-8 shadow-xl shadow-primary/20">
                  <Search className="w-4 h-4 mr-2" />
                  Start Detection
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Log Panel - Fixed Bottom */}
        <div className="h-48 bg-white/90 backdrop-blur border-t border-border flex flex-col z-20 shadow-[0_-5px_20px_rgba(0,0,0,0.02)]">
          <div className="px-4 py-2 border-b border-border flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">System Logs</span>
            </div>
            <div className="flex gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setLogs([])}>
                    <span className="sr-only">Clear</span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Clear Logs</TooltipContent>
              </Tooltip>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <Copy className="w-3 h-3" />
              </Button>
            </div>
          </div>
          <div className="flex-1 p-4 font-mono text-xs overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
            <div className="space-y-1">
              {logs.map((log) => (
                <div key={log.id} className="flex gap-3 hover:bg-slate-50 p-0.5 rounded px-2">
                  <span className="text-slate-400 select-none shrink-0">
                    {log.timestamp.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}.
                    <span className="text-[10px]">{log.timestamp.getMilliseconds().toString().padStart(3, '0')}</span>
                  </span>
                  <span className={`
                    uppercase tracking-wider text-[10px] font-bold w-16 shrink-0
                    ${log.type === 'error' ? 'text-red-500' : log.type === 'success' ? 'text-green-600' : 'text-blue-500'}
                  `}>
                    {log.type}
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
