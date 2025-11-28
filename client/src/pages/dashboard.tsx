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
  Clock,
  Calculator,
  FileText,
  Lock,
  VolumeX,
  Power,
  Globe,
  Loader2,
  XCircle
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
  { category: "Applications", items: [
    { name: "Browser", icon: <Globe className="w-4 h-4" />, path: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", args: "https://replit.com" },
    { name: "Terminal", icon: <Terminal className="w-4 h-4" />, path: "C:\\Windows\\System32\\cmd.exe", args: "/k echo Hello World" },
    { name: "Notepad", icon: <FileText className="w-4 h-4" />, path: "C:\\Windows\\System32\\notepad.exe", args: "" },
    { name: "Calculator", icon: <Calculator className="w-4 h-4" />, path: "C:\\Windows\\System32\\calc.exe", args: "" },
  ]},
  { category: "System", items: [
    { name: "Lock Screen", icon: <Lock className="w-4 h-4" />, path: "C:\\Windows\\System32\\rundll32.exe", args: "user32.dll,LockWorkStation" },
    { name: "Mute Volume", icon: <VolumeX className="w-4 h-4" />, path: "nircmd.exe", args: "mutesysvolume 2" },
    { name: "Shutdown", icon: <Power className="w-4 h-4 text-red-500" />, path: "shutdown.exe", args: "/s /t 60" },
  ]},
  { category: "AI & Scripts", items: [
    { name: "AI Assistant", icon: <Zap className="w-4 h-4" />, path: "C:\\Program Files\\AI\\assistant.exe", args: "--listen" },
    { name: "Python Script", icon: <FileText className="w-4 h-4" />, path: "python.exe", args: "script.py" },
  ]}
];

export default function Dashboard() {
  const [devices, setDevices] = useState<Device[]>(MOCK_DEVICES);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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
  
  const filteredDevices = devices.filter(device => 
    device.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    device.vid.toLowerCase().includes(searchQuery.toLowerCase()) || 
    device.pid.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // --- Handlers ---

  const handleRefresh = () => {
    addLog("info", "Refreshing device list...");
    setDevices(prev => prev.map(d => ({ ...d, status: d.id === '3' ? 'disconnected' : d.status }))); // Reset mock state
    setTimeout(() => {
      addLog("success", "Found 3 HID devices");
      toast({ title: "Refreshed", description: "Device list updated" });
    }, 800);
  };

  const toggleMonitoring = () => {
    setIsMonitoring(!isMonitoring);
    if (!isMonitoring) {
      addLog("info", "Started 'Find by Press' monitoring");
      // Mock finding a device after 3 seconds
      setTimeout(() => {
        if (Math.random() > 0.5) { // 50% chance to auto-find for demo
             toast({ title: "Device Detected!", description: "Generic USB Button pressed" });
             handleSelectDevice("2");
             setIsMonitoring(false);
        }
      }, 3000);
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
    setIsSaving(true);
    
    // Simulate API call
    setTimeout(() => {
        addLog("success", `Configuration saved for ${selectedDevice.vid}:${selectedDevice.pid}`);
        toast({ title: "Saved", description: "Button configuration updated successfully" });
        
        setDevices(prev => prev.map(d => 
          d.id === selectedDeviceId ? { ...d, status: "configured" } : d
        ));
        setIsSaving(false);
    }, 800);
  };

  const handleSelectDevice = (id: string) => {
    setSelectedDeviceId(id);
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
    
    if (device?.status === "disconnected") {
        addLog("error", `Could not connect to ${device.name}: Device disconnected`);
    } else {
        addLog("info", `Selected device: ${device?.name} (${device?.vid}:${device?.pid})`);
    }
  };

  const applyPreset = (preset: any) => {
    if (selectedDevice?.status === "disconnected") return;
    
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
          
          {/* Search & Refresh */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search devices..." 
                className="pl-9 bg-background/50" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
                >
                {isMonitoring ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Zap className="w-3.5 h-3.5 mr-2 fill-white/20" />}
                {isMonitoring ? "Detecting..." : "Find Button"}
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground" onClick={handleRefresh}>
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
                        <span className="bg-sidebar-accent px-1 rounded text-foreground/70">{device.vid}:{device.pid}</span>
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
                        <Button variant="outline" onClick={toggleMonitoring}>Cancel Detection</Button>
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
                        >
                        {selectedDevice.name}
                        </motion.h2>
                        {selectedDevice.status === 'disconnected' && (
                            <Badge variant="destructive" className="animate-pulse">DISCONNECTED</Badge>
                        )}
                    </div>
                    
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
                    <Button variant="outline" className="bg-background/50 backdrop-blur" onClick={() => addLog("info", "Test trigger sent")} disabled={selectedDevice.status === 'disconnected'}>
                      <Play className="w-4 h-4 mr-2 text-blue-500" /> Test
                    </Button>
                    <Button onClick={handleSaveConfig} disabled={isSaving || selectedDevice.status === 'disconnected'} className="shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-shadow min-w-[140px]">
                      {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                      {isSaving ? "Saving..." : "Save Config"}
                    </Button>
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
                    /* Configuration Form */
                    <div className="grid grid-cols-12 gap-6 flex-1 min-h-0">
                    <div className="col-span-8 space-y-6">
                        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-md h-full">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                            <Settings className="w-5 h-5 text-primary" />
                            Action Settings
                            </CardTitle>
                            <CardDescription>Configure what happens when you press the button.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-8">
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

                            <Separator />

                            <div className="space-y-3">
                            <Label>Trigger Type</Label>
                            <div className="grid grid-cols-3 gap-4">
                                {[
                                { id: "single-press", label: "Single Press", icon: MousePointerClick, desc: "Standard click" },
                                { id: "double-press", label: "Double Press", icon: Copy, desc: "Quick double click" },
                                { id: "long-press", label: "Long Press", icon: Clock, desc: "Hold > 500ms" },
                                ].map((type) => (
                                <div 
                                    key={type.id}
                                    onClick={() => setConfig({...config, actionType: type.id as any})}
                                    className={`
                                    cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center gap-2 transition-all relative overflow-hidden
                                    ${config.actionType === type.id 
                                        ? "border-primary bg-primary/5 text-primary" 
                                        : "border-transparent bg-secondary/50 hover:bg-secondary hover:scale-[1.02]"
                                    }
                                    `}
                                >
                                    {config.actionType === type.id && (
                                        <div className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full" />
                                    )}
                                    <type.icon className="w-6 h-6 mb-1" />
                                    <div className="text-center">
                                        <div className="text-sm font-bold leading-none mb-1">{type.label}</div>
                                        <div className="text-[10px] text-muted-foreground opacity-80">{type.desc}</div>
                                    </div>
                                </div>
                                ))}
                            </div>
                            </div>
                        </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar / Presets */}
                    <div className="col-span-4 space-y-6">
                        <Card className="border-none shadow-md bg-white/60 backdrop-blur-sm h-full flex flex-col">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                <Zap className="w-4 h-4" /> Quick Presets
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6 flex-1 overflow-y-auto pr-2">
                            {PRESETS.map((category, i) => (
                                <div key={i} className="space-y-2">
                                    <h4 className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest pl-1">{category.category}</h4>
                                    <div className="grid grid-cols-1 gap-2">
                                        {category.items.map((preset) => (
                                        <Button
                                            key={preset.name}
                                            variant="outline"
                                            className="w-full justify-start h-auto py-2.5 px-3 border-border/50 hover:border-primary/50 hover:bg-primary/5 group relative overflow-hidden"
                                            onClick={() => applyPreset(preset)}
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center mr-3 group-hover:bg-primary group-hover:text-white transition-colors shrink-0">
                                            {preset.icon}
                                            </div>
                                            <div className="text-left min-w-0 flex-1">
                                            <div className="font-medium text-sm truncate">{preset.name}</div>
                                            <div className="text-[10px] text-muted-foreground truncate opacity-70 font-mono">
                                                {preset.path.split('\\').pop() || preset.path}
                                            </div>
                                            </div>
                                        </Button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                        </Card>
                    </div>
                    </div>
                )}
              </motion.div>
            ) : (
              <motion.div 
                key="empty-state"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground space-y-6"
              >
                <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-slate-100 to-slate-200 flex items-center justify-center shadow-inner mb-4 relative">
                    <div className="absolute inset-0 rounded-full border border-slate-200 animate-[spin_10s_linear_infinite]" />
                    <div className="w-24 h-24 rounded-full bg-white shadow-xl flex items-center justify-center relative z-10">
                        <Usb className="w-10 h-10 text-slate-300" />
                    </div>
                </div>
                <div className="max-w-md space-y-2">
                  <h2 className="text-2xl font-bold text-foreground">No Device Selected</h2>
                  <p>Select a USB device from the sidebar to configure it, or use the detection mode to find your button.</p>
                </div>
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
                    <XCircle className="w-3 h-3" />
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
                <div key={log.id} className="flex gap-3 hover:bg-slate-50 p-0.5 rounded px-2 group">
                  <span className="text-slate-400 select-none shrink-0 group-hover:text-slate-500 transition-colors">
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
