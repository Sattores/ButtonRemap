use crate::types::HidDevice;
use std::sync::mpsc::Receiver;

/// Trait for input monitoring implementations
/// Allows different strategies (Raw Input, HID) to detect device input
pub trait InputMonitor: Send {
    /// Start monitoring for input from any device
    /// Returns a receiver that will send the first detected device
    fn start_monitoring(&mut self) -> Receiver<HidDevice>;

    /// Stop monitoring
    fn stop_monitoring(&self);

    /// Get the name of this monitor implementation
    fn name(&self) -> &str;
}

/// Monitor manager that runs multiple monitors in parallel
pub struct ParallelMonitor {
    monitors: Vec<Box<dyn InputMonitor>>,
}

impl ParallelMonitor {
    pub fn new() -> Self {
        Self {
            monitors: Vec::new(),
        }
    }

    pub fn add_monitor(&mut self, monitor: Box<dyn InputMonitor>) {
        self.monitors.push(monitor);
    }

    /// Start all monitors in parallel, return first device detected
    pub fn start_all(&mut self) -> Receiver<HidDevice> {
        use std::sync::mpsc::channel;

        let (tx, rx) = channel();

        println!("🚀 [ParallelMonitor] Starting {} monitors in parallel", self.monitors.len());

        for monitor in &mut self.monitors {
            let monitor_rx = monitor.start_monitoring();
            let monitor_name = monitor.name().to_string();
            let tx_clone = tx.clone();

            // Spawn thread to listen to this monitor
            std::thread::spawn(move || {
                println!("👂 [ParallelMonitor] {} listener started", monitor_name);

                if let Ok(device) = monitor_rx.recv() {
                    println!("✅ [ParallelMonitor] {} detected device first!", monitor_name);
                    let _ = tx_clone.send(device);
                }
            });
        }

        rx
    }

    pub fn stop_all(&self) {
        for monitor in &self.monitors {
            monitor.stop_monitoring();
        }
    }
}
