use crate::input_monitor::InputMonitor;
use crate::types::{DeviceStatus, HidDevice, MonitoringState};
use hidapi::{HidApi, HidDevice as RawHidDevice};
use std::collections::HashSet;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::mpsc::{channel, Receiver, Sender};
use std::sync::Arc;
use std::thread;
use std::time::Duration;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum HidError {
    #[error("Failed to initialize HID API: {0}")]
    InitError(String),
    #[error("Device not found: {0}")]
    DeviceNotFound(String),
    #[error("Failed to open device: {0}")]
    OpenError(String),
    #[error("Read error: {0}")]
    ReadError(String),
}

/// Result of device refresh, containing both current and disconnected devices
#[derive(Debug, Clone)]
pub struct DeviceRefreshResult {
    pub devices: Vec<HidDevice>,
    pub disconnected_ids: Vec<String>,
}

pub struct HidManager {
    api: HidApi,
    monitoring_active: Arc<AtomicBool>,
    configured_devices: Vec<String>, // Device IDs that have bindings
    previous_devices: HashSet<String>, // Track previously seen device IDs for disconnection detection
}

impl HidManager {
    pub fn new() -> Result<Self, HidError> {
        let api = HidApi::new().map_err(|e| HidError::InitError(e.to_string()))?;

        Ok(Self {
            api,
            monitoring_active: Arc::new(AtomicBool::new(false)),
            configured_devices: Vec::new(),
            previous_devices: HashSet::new(),
        })
    }

    pub fn list_devices(&mut self) -> Result<Vec<HidDevice>, HidError> {
        // Refresh device list
        self.api.refresh_devices().map_err(|e| HidError::InitError(e.to_string()))?;

        let mut devices = Vec::new();
        let mut current_device_ids = HashSet::new();

        for device_info in self.api.device_list() {
            let vendor_id = format!("{:04X}", device_info.vendor_id());
            let product_id = format!("{:04X}", device_info.product_id());
            let device_id = format!("{}:{}", vendor_id, product_id);

            // Track current device IDs
            current_device_ids.insert(device_id.clone());

            // Determine status based on whether we have a binding
            let status = if self.configured_devices.contains(&device_id) {
                DeviceStatus::Configured
            } else {
                DeviceStatus::Connected
            };

            let device = HidDevice {
                id: device_id,
                name: device_info
                    .product_string()
                    .unwrap_or("Unknown Device")
                    .to_string(),
                vendor_id,
                product_id,
                interface_number: device_info.interface_number() as u8,
                total_interfaces: 1, // HidAPI doesn't directly expose this
                status,
                manufacturer: device_info.manufacturer_string().map(|s| s.to_string()),
                serial_number: device_info.serial_number().map(|s| s.to_string()),
            };

            // Avoid duplicates (same VID:PID)
            if !devices.iter().any(|d: &HidDevice| d.id == device.id) {
                devices.push(device);
            }
        }

        // Update previous devices for next comparison
        self.previous_devices = current_device_ids;

        Ok(devices)
    }

    /// Refresh devices and detect disconnections
    pub fn refresh_devices_with_disconnections(&mut self) -> Result<DeviceRefreshResult, HidError> {
        // Refresh device list
        self.api.refresh_devices().map_err(|e| HidError::InitError(e.to_string()))?;

        let mut devices = Vec::new();
        let mut current_device_ids = HashSet::new();

        for device_info in self.api.device_list() {
            let vendor_id = format!("{:04X}", device_info.vendor_id());
            let product_id = format!("{:04X}", device_info.product_id());
            let device_id = format!("{}:{}", vendor_id, product_id);

            // Track current device IDs
            current_device_ids.insert(device_id.clone());

            // Determine status based on whether we have a binding
            let status = if self.configured_devices.contains(&device_id) {
                DeviceStatus::Configured
            } else {
                DeviceStatus::Connected
            };

            let device = HidDevice {
                id: device_id,
                name: device_info
                    .product_string()
                    .unwrap_or("Unknown Device")
                    .to_string(),
                vendor_id,
                product_id,
                interface_number: device_info.interface_number() as u8,
                total_interfaces: 1,
                status,
                manufacturer: device_info.manufacturer_string().map(|s| s.to_string()),
                serial_number: device_info.serial_number().map(|s| s.to_string()),
            };

            // Avoid duplicates (same VID:PID)
            if !devices.iter().any(|d: &HidDevice| d.id == device.id) {
                devices.push(device);
            }
        }

        // Find disconnected devices (were in previous but not in current)
        let disconnected_ids: Vec<String> = self.previous_devices
            .difference(&current_device_ids)
            .cloned()
            .collect();

        // Log disconnections
        for id in &disconnected_ids {
            log::info!("Device disconnected: {}", id);
        }

        // Update previous devices for next comparison
        self.previous_devices = current_device_ids;

        Ok(DeviceRefreshResult {
            devices,
            disconnected_ids,
        })
    }

    pub fn refresh_devices(&mut self) -> Result<Vec<HidDevice>, HidError> {
        self.list_devices()
    }

    pub fn get_device_info(&self, device_id: &str) -> Result<HidDevice, HidError> {
        let parts: Vec<&str> = device_id.split(':').collect();
        if parts.len() != 2 {
            return Err(HidError::DeviceNotFound(device_id.to_string()));
        }
        
        let vid = u16::from_str_radix(parts[0], 16)
            .map_err(|_| HidError::DeviceNotFound(device_id.to_string()))?;
        let pid = u16::from_str_radix(parts[1], 16)
            .map_err(|_| HidError::DeviceNotFound(device_id.to_string()))?;
        
        for device_info in self.api.device_list() {
            if device_info.vendor_id() == vid && device_info.product_id() == pid {
                let vendor_id = format!("{:04X}", device_info.vendor_id());
                let product_id = format!("{:04X}", device_info.product_id());
                let id = format!("{}:{}", vendor_id, product_id);
                
                return Ok(HidDevice {
                    id: id.clone(),
                    name: device_info
                        .product_string()
                        .unwrap_or("Unknown Device")
                        .to_string(),
                    vendor_id,
                    product_id,
                    interface_number: device_info.interface_number() as u8,
                    total_interfaces: 1,
                    status: if self.configured_devices.contains(&id) {
                        DeviceStatus::Configured
                    } else {
                        DeviceStatus::Connected
                    },
                    manufacturer: device_info.manufacturer_string().map(|s| s.to_string()),
                    serial_number: device_info.serial_number().map(|s| s.to_string()),
                });
            }
        }
        
        Err(HidError::DeviceNotFound(device_id.to_string()))
    }

    pub fn set_device_configured(&mut self, device_id: &str) {
        if !self.configured_devices.contains(&device_id.to_string()) {
            self.configured_devices.push(device_id.to_string());
        }
    }

    pub fn set_device_unconfigured(&mut self, device_id: &str) {
        self.configured_devices.retain(|id| id != device_id);
    }

    pub fn start_monitoring(&self) -> Result<(), HidError> {
        self.monitoring_active.store(true, Ordering::SeqCst);
        log::info!("Started HID monitoring mode");
        Ok(())
    }

    pub fn stop_monitoring(&self) {
        self.monitoring_active.store(false, Ordering::SeqCst);
        log::info!("Stopped HID monitoring mode");
    }

    pub fn is_monitoring(&self) -> bool {
        self.monitoring_active.load(Ordering::SeqCst)
    }

    pub fn get_monitoring_state(&self) -> MonitoringState {
        MonitoringState {
            is_active: self.is_monitoring(),
            detected_device: None, // Populated during actual monitoring
        }
    }

    // This is called from a separate monitoring thread
    pub fn monitor_for_input<F>(&self, mut callback: F) -> Result<(), HidError>
    where
        F: FnMut(HidDevice) + Send + 'static,
    {
        let monitoring = self.monitoring_active.clone();

        thread::spawn(move || {
            println!("🚀 [RUST-THREAD] ====== THREAD SPAWNED ======");
            println!("🔵 [RUST-THREAD] HID monitoring thread started");
            log::info!("HID monitoring thread started");

            // List ALL devices to verify XFKEY is visible
            println!("🔍 [RUST-THREAD] Enumerating all HID devices to find AF88:6688...");
            match HidApi::new() {
                Ok(temp_api) => {
                    let mut found_xfkey = false;
                    let mut xfkey_count = 0;
                    for device_info in temp_api.device_list() {
                        let vid = device_info.vendor_id();
                        let pid = device_info.product_id();
                        let name = device_info.product_string().unwrap_or("Unknown");
                        let interface = device_info.interface_number();

                        if vid == 0xAF88 && pid == 0x6688 {
                            xfkey_count += 1;
                            found_xfkey = true;
                            println!("  ✅ XFKEY #{}: Interface {}", xfkey_count, interface);
                        } else {
                            println!("  📋 Device: {:04X}:{:04X} - {} (Interface {})", vid, pid, name, interface);
                        }
                    }
                    if !found_xfkey {
                        println!("  ❌ XFKEY (AF88:6688) NOT FOUND in device list!");
                    }
                }
                Err(e) => {
                    println!("  ❌ Failed to enumerate devices: {}", e);
                }
            }

            println!("🔵 [RUST-THREAD] Checking monitoring flag: {}", monitoring.load(Ordering::SeqCst));

            while monitoring.load(Ordering::SeqCst) {
                println!("🔵 [RUST-THREAD] Inside while loop - iteration start");
                // Create fresh HID API instance for this iteration
                match HidApi::new() {
                    Ok(api) => {
                        let device_count = api.device_list().count();
                        println!("🔍 [RUST-THREAD] Polling {} HID devices", device_count);
                        log::debug!("Polling {} HID devices for input", device_count);

                        let mut devices_opened = 0;
                        let mut devices_read = 0;

                        for device_info in api.device_list() {
                            // FILTER: Only monitor the XFKEY device for testing
                            if device_info.vendor_id() != 0xAF88 || device_info.product_id() != 0x6688 {
                                continue;
                            }

                            println!("🎯 [RUST-THREAD] Found XFKEY device! Attempting to read...");

                            // Skip if monitoring stopped
                            if !monitoring.load(Ordering::SeqCst) {
                                log::info!("Monitoring stopped during device iteration");
                                return;
                            }

                            // Try to open device
                            match device_info.open_device(&api) {
                                Ok(device) => {
                                    devices_opened += 1;
                                    println!("🎯 [RUST-THREAD] XFKEY device opened successfully!");
                                    let mut buf = [0u8; 256];  // Larger buffer for XFKEY

                                    // Non-blocking read with timeout (500ms for XFKEY)
                                    println!("🎯 [RUST-THREAD] Waiting for input (500ms timeout)...");
                                    match device.read_timeout(&mut buf, 500) {
                                        Ok(size) if size > 0 => {
                                            devices_read += 1;
                                            println!("🔥 [RUST-THREAD] ✅ INPUT DETECTED! Read {} bytes from XFKEY!", size);
                                            // Input detected!
                                            let vendor_id = format!("{:04X}", device_info.vendor_id());
                                            let product_id = format!("{:04X}", device_info.product_id());

                                            let detected_device = HidDevice {
                                                id: format!("{}:{}", vendor_id, product_id),
                                                name: device_info.product_string().unwrap_or("Unknown Device").to_string(),
                                                vendor_id,
                                                product_id,
                                                interface_number: device_info.interface_number() as u8,
                                                total_interfaces: 1,
                                                status: DeviceStatus::Connected,
                                                manufacturer: device_info.manufacturer_string().map(|s| s.to_string()),
                                                serial_number: device_info.serial_number().map(|s| s.to_string()),
                                            };

                                            log::info!(
                                                "Input detected from: {} ({}:{}, Interface {})",
                                                detected_device.name,
                                                detected_device.vendor_id,
                                                detected_device.product_id,
                                                detected_device.interface_number
                                            );

                                            // Stop monitoring and call callback
                                            monitoring.store(false, Ordering::SeqCst);
                                            callback(detected_device);
                                            return;
                                        }
                                        Ok(_) => {
                                            println!("⚪ [RUST-THREAD] No input detected (timeout reached)");
                                            // No input, continue
                                        }
                                        Err(e) => {
                                            println!("❌ [RUST-THREAD] Read error on XFKEY: {}", e);
                                            log::trace!("Read error on {}:{}: {}",
                                                device_info.vendor_id(),
                                                device_info.product_id(),
                                                e
                                            );
                                        }
                                    }
                                }
                                Err(e) => {
                                    println!("❌ [RUST-THREAD] Cannot open XFKEY device: {}", e);
                                    log::trace!(
                                        "Cannot open {}:{}: {}",
                                        device_info.vendor_id(),
                                        device_info.product_id(),
                                        e
                                    );
                                }
                            }
                        }

                        println!("📊 [RUST-THREAD] Devices opened: {}/{}, Devices with input: {}", devices_opened, device_count, devices_read);
                    }
                    Err(e) => {
                        log::error!("Failed to create HID API: {}", e);
                        monitoring.store(false, Ordering::SeqCst);
                        return;
                    }
                }

                thread::sleep(Duration::from_millis(50));
            }

            log::info!("HID monitoring thread stopped normally");
        });

        Ok(())
    }
}

impl InputMonitor for HidManager {
    fn start_monitoring(&mut self) -> Receiver<HidDevice> {
        let (tx, rx) = channel();
        let monitoring = self.monitoring_active.clone();

        monitoring.store(true, Ordering::SeqCst);
        println!("🟢 [HidMonitor] Starting HID monitoring");

        thread::spawn(move || {
            println!("🔵 [HidMonitor] HID monitoring thread started");

            while monitoring.load(Ordering::SeqCst) {
                match HidApi::new() {
                    Ok(api) => {
                        for device_info in api.device_list() {
                            if !monitoring.load(Ordering::SeqCst) {
                                return;
                            }

                            match device_info.open_device(&api) {
                                Ok(device) => {
                                    let mut buf = [0u8; 256];
                                    match device.read_timeout(&mut buf, 100) {
                                        Ok(size) if size > 0 => {
                                            println!("🔥 [HidMonitor] Input detected from HID device!");

                                            let vendor_id = format!("{:04X}", device_info.vendor_id());
                                            let product_id = format!("{:04X}", device_info.product_id());

                                            let detected_device = HidDevice {
                                                id: format!("{}:{}", vendor_id, product_id),
                                                name: device_info.product_string().unwrap_or("Unknown Device").to_string(),
                                                vendor_id,
                                                product_id,
                                                interface_number: device_info.interface_number() as u8,
                                                total_interfaces: 1,
                                                status: DeviceStatus::Connected,
                                                manufacturer: device_info.manufacturer_string().map(|s| s.to_string()),
                                                serial_number: device_info.serial_number().map(|s| s.to_string()),
                                            };

                                            monitoring.store(false, Ordering::SeqCst);
                                            let _ = tx.send(detected_device);
                                            return;
                                        }
                                        _ => {
                                            // No input or error, continue
                                        }
                                    }
                                }
                                Err(_) => {
                                    // Cannot open device, continue
                                }
                            }
                        }
                    }
                    Err(e) => {
                        println!("❌ [HidMonitor] Failed to create HID API: {}", e);
                        monitoring.store(false, Ordering::SeqCst);
                        return;
                    }
                }

                thread::sleep(Duration::from_millis(50));
            }

            println!("🔵 [HidMonitor] Monitoring thread stopped");
        });

        rx
    }

    fn stop_monitoring(&self) {
        self.monitoring_active.store(false, Ordering::SeqCst);
        println!("🛑 [HidMonitor] Stop monitoring requested");
    }

    fn name(&self) -> &str {
        "HID"
    }
}
