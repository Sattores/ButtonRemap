use crate::types::{DeviceStatus, HidDevice, MonitoringState};
use hidapi::{HidApi, HidDevice as RawHidDevice};
use std::sync::atomic::{AtomicBool, Ordering};
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

pub struct HidManager {
    api: HidApi,
    monitoring_active: Arc<AtomicBool>,
    configured_devices: Vec<String>, // Device IDs that have bindings
}

impl HidManager {
    pub fn new() -> Result<Self, HidError> {
        let api = HidApi::new().map_err(|e| HidError::InitError(e.to_string()))?;
        
        Ok(Self {
            api,
            monitoring_active: Arc::new(AtomicBool::new(false)),
            configured_devices: Vec::new(),
        })
    }

    pub fn list_devices(&mut self) -> Result<Vec<HidDevice>, HidError> {
        // Refresh device list
        self.api.refresh_devices().map_err(|e| HidError::InitError(e.to_string()))?;
        
        let mut devices = Vec::new();
        
        for device_info in self.api.device_list() {
            let vendor_id = format!("{:04X}", device_info.vendor_id());
            let product_id = format!("{:04X}", device_info.product_id());
            let device_id = format!("{}:{}", vendor_id, product_id);
            
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
        
        Ok(devices)
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

    // This would be called from a separate monitoring thread
    pub fn monitor_for_input<F>(&self, mut callback: F) -> Result<(), HidError>
    where
        F: FnMut(HidDevice) + Send + 'static,
    {
        let monitoring = self.monitoring_active.clone();
        
        // In production, this would iterate through devices and poll for input
        // For now, this is a placeholder that demonstrates the pattern
        thread::spawn(move || {
            while monitoring.load(Ordering::SeqCst) {
                // Poll all HID devices for input
                // When input is detected, call callback with the device
                thread::sleep(Duration::from_millis(50));
            }
        });
        
        Ok(())
    }
}
