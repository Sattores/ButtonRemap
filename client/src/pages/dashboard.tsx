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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";

import bgImage from "@assets/generated_images/minimalist_abstract_geometric_shapes_in_soft_white_and_light_gray.png";
// import appIcon from "@assets/generated_images/flat_minimalist_usb_icon.png";

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
  { category: "AI & Voice Actions", items: [
    { name: "Voice Input (Whisper)", icon: <Mic className="w-4 h-4 text-primary" />, path: "python", args: "scripts/whisper_input.py" },
    { name: "Ask Selection (LLM)", icon: <Sparkles className="w-4 h-4 text-amber-500" />, path: "scripts/ask_llm.bat", args: "--clipboard" },
    { name: "Toggle ChatGPT Voice", icon: <Bot className="w-4 h-4 text-emerald-500" />, path: "C:\\Apps\\ChatGPT\\ChatGPT.exe", args: "--voice-mode" },
    { name: "Mute Microphone", icon: <MicOff className="w-4 h-4 text-red-500" />, path: "nircmd.exe", args: "mutesysvolume 2 microphone" },
  ]},
  { category: "Productivity", items: [
    { name: "Screenshot Area", icon: <Camera className="w-4 h-4" />, path: "snippingtool.exe", args: "/clip" },
    { name: "Open Terminal", icon: <Terminal className="w-4 h-4" />, path: "wt.exe", args: "" },
    { name: "Calculator", icon: <Calculator className="w-4 h-4" />, path: "calc.exe", args: "" },
  ]},
  { category: "System Controls", items: [
    { name: "Lock Workstation", icon: <Lock className="w-4 h-4" />, path: "rundll32.exe", args: "user32.dll,LockWorkStation" },
    { name: "Mute System Audio", icon: <VolumeX className="w-4 h-4" />, path: "nircmd.exe", args: "mutesysvolume 2" },
    { name: "Emergency Stop", icon: <Power className="w-4 h-4 text-red-500" />, path: "shutdown.exe", args: "/s /t 0" },
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
  const [isAutoScroll, setIsAutoScroll] = useState(true);
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

  const handleResetConfig = () => {
    if (!selectedDevice) return;
    
    setConfig({ appPath: "", appArgs: "", actionType: "single-press" });
    
    // Simulate API call to clear
    addLog("info", `Configuration cleared for ${selectedDevice.vid}:${selectedDevice.pid}`);
    toast({ title: "Reset", description: "Button configuration cleared" });
    
    setDevices(prev => prev.map(d => 
      d.id === selectedDeviceId ? { ...d, status: "connected" } : d
    ));
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
            {/* App Icon based on Empty State Design */}
            <div className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-tr from-slate-100 to-slate-200 flex items-center justify-center shadow-sm border border-slate-200/50 relative overflow-hidden">
                <div className="absolute inset-0 rounded-full border border-slate-300/30 animate-[spin_10s_linear_infinite]" />
                <div className="w-7 h-7 rounded-full bg-white shadow-sm flex items-center justify-center relative z-10">
                    <Usb className="w-3.5 h-3.5 text-slate-400" />
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
                        <CardContent className="space-y-6 flex-1">
                            
                            {/* Quick Presets Dropdown */}
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quick Preset</Label>
                                <Select onValueChange={(val) => {
                                    const allPresets = PRESETS.flatMap(p => p.items);
                                    const selected = allPresets.find(p => p.name === val);
                                    if (selected) applyPreset(selected);
                                }}>
                                    <SelectTrigger className="h-12 bg-secondary/30 border-border/50">
                                        <SelectValue placeholder="Select a preset..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PRESETS.map((category, i) => (
                                            <React.Fragment key={i}>
                                                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{category.category}</div>
                                                {category.items.map(item => (
                                                    <SelectItem key={item.name} value={item.name}>
                                                        <div className="flex items-center gap-2">
                                                            {item.icon}
                                                            <span>{item.name}</span>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                                {i < PRESETS.length - 1 && <Separator className="my-1" />}
                                            </React.Fragment>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* App Path */}
                            <div className="space-y-2">
                            <Label htmlFor="app-path" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Application Path</Label>
                            <div className="flex gap-2">
                                <Input 
                                id="app-path" 
                                placeholder="C:\Path\To\Application.exe" 
                                value={config.appPath}
                                onChange={(e) => setConfig({...config, appPath: e.target.value})}
                                className="font-mono text-sm bg-background/50 h-10"
                                />
                                <Button variant="secondary" size="icon" className="h-10 w-10 shrink-0">
                                    <MoreHorizontal className="w-4 h-4" />
                                </Button>
                            </div>
                            </div>

                            {/* Arguments */}
                            <div className="space-y-2">
                            <Label htmlFor="app-args" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Arguments</Label>
                            <Input 
                                id="app-args" 
                                placeholder="e.g. --fullscreen --silent" 
                                value={config.appArgs}
                                onChange={(e) => setConfig({...config, appArgs: e.target.value})}
                                className="font-mono text-sm bg-background/50 h-10"
                            />
                            </div>

                            <Separator className="my-2" />

                            {/* Trigger Type */}
                            <div className="space-y-3">
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Trigger Type</Label>
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
                                    cursor-pointer rounded-xl border-2 p-3 flex flex-col items-center gap-2 transition-all relative overflow-hidden
                                    ${config.actionType === type.id 
                                        ? "border-primary bg-primary/5 text-primary" 
                                        : "border-transparent bg-secondary/50 hover:bg-secondary hover:scale-[1.02]"
                                    }
                                    `}
                                >
                                    {config.actionType === type.id && (
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
                                    {selectedDevice.status === "configured" && (
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button variant="ghost" size="sm" onClick={handleResetConfig} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                                                    <Unlink className="w-4 h-4 mr-2" />
                                                    Reset Mapping
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>Unbind current configuration</TooltipContent>
                                        </Tooltip>
                                    )}
                                </div>
                                <div className="flex items-center gap-3">
                                    <Button variant="ghost" onClick={() => addLog("info", "Test trigger sent")} className="text-muted-foreground hover:text-primary">
                                        <PlayCircle className="w-4 h-4 mr-2" /> Test Action
                                    </Button>
                                    <Button onClick={handleSaveConfig} disabled={isSaving} className="min-w-[140px] shadow-lg shadow-primary/20 hover:shadow-primary/30">
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
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 border-r border-border/50 pr-3 mr-1">
                 <Label htmlFor="autoscroll" className="text-[10px] text-muted-foreground uppercase font-bold cursor-pointer">Auto-scroll</Label>
                 <Switch id="autoscroll" checked={isAutoScroll} onCheckedChange={setIsAutoScroll} className="scale-75" />
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                      const text = logs.map(l => `[${l.timestamp.toISOString()}] ${l.type.toUpperCase()}: ${l.message}`).join('\n');
                      // Mock save
                      toast({ title: "Logs Saved", description: "Saved to logs.txt" });
                  }}>
                    <Download className="w-3 h-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Save to File</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                      const text = logs.map(l => `[${l.timestamp.toISOString()}] ${l.type.toUpperCase()}: ${l.message}`).join('\n');
                      navigator.clipboard.writeText(text);
                      toast({ title: "Copied", description: "Logs copied to clipboard" });
                  }}>
                    <Copy className="w-3 h-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy to Clipboard</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive" onClick={() => setLogs([])}>
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
