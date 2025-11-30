use crate::input_monitor::InputMonitor;
use crate::types::{DeviceStatus, HidDevice};
use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::mpsc::{channel, Receiver, Sender};
use std::sync::Arc;
use std::thread;

static MONITOR_COUNTER: AtomicU32 = AtomicU32::new(0);
use windows::Win32::Devices::HumanInterfaceDevice::*;
use windows::Win32::Foundation::*;
use windows::Win32::System::LibraryLoader::*;
use windows::Win32::UI::Input::*;
use windows::Win32::UI::WindowsAndMessaging::*;

#[derive(Debug, Clone)]
pub struct RawInputDevice {
    pub vendor_id: u16,
    pub product_id: u16,
    pub device_handle: isize,
    pub device_name: String,
}

pub struct RawInputMonitor {
    tx: Option<Sender<RawInputDevice>>,
    window_class: Vec<u16>,
    monitoring_active: Arc<AtomicBool>,
}

impl RawInputMonitor {
    pub fn new() -> Self {
        Self {
            tx: None,
            window_class: Self::create_window_class_name(),
            monitoring_active: Arc::new(AtomicBool::new(false)),
        }
    }

    fn create_window_class_name() -> Vec<u16> {
        use std::os::windows::ffi::OsStrExt;
        use std::ffi::OsStr;
        // Use unique class name per instance to avoid conflicts
        let counter = MONITOR_COUNTER.fetch_add(1, Ordering::SeqCst);
        let class_name = format!("RawInputMonitorClass_{}", counter);
        OsStr::new(&class_name)
            .encode_wide()
            .chain(Some(0))
            .collect()
    }

    /// Start monitoring for keyboard input from any device
    /// Returns a channel receiver that will receive detected devices
    fn start_monitoring_internal(&mut self) -> std::sync::mpsc::Receiver<RawInputDevice> {
        let (tx, rx) = channel();
        let tx_clone = tx.clone();
        self.tx = Some(tx);

        let class_name = self.window_class.clone();
        let monitoring_active = self.monitoring_active.clone();

        monitoring_active.store(true, Ordering::SeqCst);

        thread::spawn(move || {
            unsafe {
                if let Err(e) = Self::run_message_loop(tx_clone, &class_name) {
                    eprintln!("Raw Input monitoring error: {:?}", e);
                }
            }
            monitoring_active.store(false, Ordering::SeqCst);
        });

        rx
    }

    unsafe fn run_message_loop(
        tx: Sender<RawInputDevice>,
        class_name: &[u16],
    ) -> windows::core::Result<()> {
        println!("🔵 [RawInput] Creating message window...");

        // Create a message-only window
        let h_instance = GetModuleHandleW(None)?;

        let wc = WNDCLASSW {
            lpfnWndProc: Some(Self::window_proc),
            hInstance: h_instance.into(),
            lpszClassName: windows::core::PCWSTR(class_name.as_ptr()),
            ..Default::default()
        };

        let atom = RegisterClassW(&wc);
        if atom == 0 {
            println!("❌ [RawInput] RegisterClassW failed");
            return Err(windows::core::Error::from_win32());
        }

        println!("🔵 [RawInput] Registered window class: atom = {}", atom);

        let hwnd = CreateWindowExW(
            WINDOW_EX_STYLE::default(),
            windows::core::PCWSTR(class_name.as_ptr()),
            windows::core::w!("RawInputMonitor"),
            WINDOW_STYLE::default(),
            0,
            0,
            0,
            0,
            HWND_MESSAGE, // Message-only window
            None,
            h_instance,
            None,
        )?;

        if hwnd.0.is_null() {
            println!("❌ [RawInput] CreateWindowExW failed");
            return Err(windows::core::Error::from_win32());
        }

        println!("🔵 [RawInput] Created message window: {:?}", hwnd);

        // Store the channel sender in window user data
        let tx_ptr = Box::into_raw(Box::new(tx));
        SetWindowLongPtrW(hwnd, GWLP_USERDATA, tx_ptr as isize);

        // Register for raw keyboard input
        let rid = RAWINPUTDEVICE {
            usUsagePage: HID_USAGE_PAGE_GENERIC,
            usUsage: HID_USAGE_GENERIC_KEYBOARD,
            dwFlags: RIDEV_INPUTSINK, // Receive input even when not focused
            hwndTarget: hwnd,
        };

        if let Err(e) = RegisterRawInputDevices(&[rid], std::mem::size_of::<RAWINPUTDEVICE>() as u32) {
            println!("❌ [RawInput] RegisterRawInputDevices failed: {:?}", e);
            return Err(e);
        }

        println!("✅ [RawInput] Registered for raw keyboard input");

        // Message loop
        let mut msg = MSG::default();
        loop {
            let ret = GetMessageW(&mut msg, None, 0, 0);

            if ret.0 == -1 {
                // Error
                break;
            } else if ret.0 == 0 {
                // WM_QUIT
                break;
            }

            TranslateMessage(&msg);
            DispatchMessageW(&msg);
        }

        println!("🔵 [RawInput] Message loop ended");

        // Cleanup
        let _ = Box::from_raw(tx_ptr);

        Ok(())
    }

    unsafe extern "system" fn window_proc(
        hwnd: HWND,
        msg: u32,
        wparam: WPARAM,
        lparam: LPARAM,
    ) -> LRESULT {
        match msg {
            WM_INPUT => {
                println!("📨 [RawInput] WM_INPUT received");

                // Get the channel sender from window user data
                let tx_ptr = GetWindowLongPtrW(hwnd, GWLP_USERDATA) as *mut Sender<RawInputDevice>;
                if tx_ptr.is_null() {
                    return DefWindowProcW(hwnd, msg, wparam, lparam);
                }

                let tx = &*tx_ptr;

                // Get the raw input data
                let mut size: u32 = 0;
                let handle = HRAWINPUT(lparam.0 as *mut _);

                // Get required size
                let result = GetRawInputData(
                    handle,
                    RID_INPUT,
                    None,
                    &mut size,
                    std::mem::size_of::<RAWINPUTHEADER>() as u32,
                );

                if result != 0 {
                    println!("❌ [RawInput] GetRawInputData size query failed");
                    return DefWindowProcW(hwnd, msg, wparam, lparam);
                }

                println!("🔵 [RawInput] Raw input data size: {}", size);

                // Allocate buffer and get data
                let mut buffer = vec![0u8; size as usize];
                let result = GetRawInputData(
                    handle,
                    RID_INPUT,
                    Some(buffer.as_mut_ptr() as *mut _),
                    &mut size,
                    std::mem::size_of::<RAWINPUTHEADER>() as u32,
                );

                if result == u32::MAX {
                    println!("❌ [RawInput] GetRawInputData failed");
                    return DefWindowProcW(hwnd, msg, wparam, lparam);
                }

                // Cast to RAWINPUT structure
                let raw = &*(buffer.as_ptr() as *const RAWINPUT);

                // Only process keyboard input
                if raw.header.dwType == RIM_TYPEKEYBOARD.0 {
                    let keyboard = &raw.data.keyboard;

                    // Only process key down events
                    if keyboard.Message == WM_KEYDOWN {
                        println!("⌨️  [RawInput] Key down detected from device handle: {:?}", raw.header.hDevice);

                        // Get device info
                        if let Some(device_info) = Self::get_device_info(raw.header.hDevice) {
                            println!("🎯 [RawInput] Device: {:04X}:{:04X} - {}",
                                device_info.vendor_id,
                                device_info.product_id,
                                device_info.device_name
                            );

                            // Send to channel
                            let _ = tx.send(device_info);
                        }
                    }
                }

                DefWindowProcW(hwnd, msg, wparam, lparam)
            }
            WM_DESTROY => {
                println!("🔵 [RawInput] WM_DESTROY received");
                PostQuitMessage(0);
                LRESULT(0)
            }
            _ => DefWindowProcW(hwnd, msg, wparam, lparam),
        }
    }

    unsafe fn get_device_info(device_handle: HANDLE) -> Option<RawInputDevice> {
        // Get device name
        let mut name_size: u32 = 0;
        let result = GetRawInputDeviceInfoW(
            device_handle,
            RIDI_DEVICENAME,
            None,
            &mut name_size,
        );

        if result != 0 {
            println!("❌ [RawInput] GetRawInputDeviceInfoW size query failed");
            return None;
        }

        let mut name_buffer = vec![0u16; name_size as usize];
        let result = GetRawInputDeviceInfoW(
            device_handle,
            RIDI_DEVICENAME,
            Some(name_buffer.as_mut_ptr() as *mut _),
            &mut name_size,
        );

        if result == u32::MAX {
            println!("❌ [RawInput] GetRawInputDeviceInfoW failed");
            return None;
        }

        let device_name = String::from_utf16_lossy(&name_buffer[..result as usize]);
        println!("🔍 [RawInput] Device name: {}", device_name);

        // Parse VID and PID from device name
        // Format: \\?\HID#VID_XXXX&PID_YYYY&...
        let (vid, pid) = Self::parse_vid_pid(&device_name)?;

        Some(RawInputDevice {
            vendor_id: vid,
            product_id: pid,
            device_handle: device_handle.0 as isize,
            device_name,
        })
    }

    fn parse_vid_pid(device_name: &str) -> Option<(u16, u16)> {
        // Look for VID_XXXX and PID_YYYY in the device name
        let vid_start = device_name.find("VID_")?;
        let pid_start = device_name.find("PID_")?;

        let vid_str = &device_name[vid_start + 4..vid_start + 8];
        let pid_str = &device_name[pid_start + 4..pid_start + 8];

        let vid = u16::from_str_radix(vid_str, 16).ok()?;
        let pid = u16::from_str_radix(pid_str, 16).ok()?;

        Some((vid, pid))
    }
}

impl RawInputMonitor {
    /// Start persistent monitoring (doesn't stop after first detection)
    /// Used for background listener
    pub fn start_monitoring_persistent(&mut self) -> Receiver<HidDevice> {
        let (tx, rx) = channel();
        let raw_rx = self.start_monitoring_internal();

        // Spawn thread to convert RawInputDevice to HidDevice
        thread::spawn(move || {
            while let Ok(raw_device) = raw_rx.recv() {
                let hid_device = HidDevice {
                    id: format!("{:04X}:{:04X}", raw_device.vendor_id, raw_device.product_id),
                    name: raw_device.device_name.clone(),
                    vendor_id: format!("{:04X}", raw_device.vendor_id),
                    product_id: format!("{:04X}", raw_device.product_id),
                    interface_number: 0,
                    total_interfaces: 1,
                    status: DeviceStatus::Connected,
                    manufacturer: None,
                    serial_number: None,
                };

                println!("🔄 [RawInput] Device input: {} ({}:{})",
                    hid_device.name, hid_device.vendor_id, hid_device.product_id);

                let _ = tx.send(hid_device);
                // NO break - continue listening
            }
        });

        rx
    }
}

impl InputMonitor for RawInputMonitor {
    fn start_monitoring(&mut self) -> Receiver<HidDevice> {
        let (tx, rx) = channel();
        let raw_rx = self.start_monitoring_internal();

        // Spawn thread to convert RawInputDevice to HidDevice
        thread::spawn(move || {
            while let Ok(raw_device) = raw_rx.recv() {
                let hid_device = HidDevice {
                    id: format!("{:04X}:{:04X}", raw_device.vendor_id, raw_device.product_id),
                    name: raw_device.device_name.clone(),
                    vendor_id: format!("{:04X}", raw_device.vendor_id),
                    product_id: format!("{:04X}", raw_device.product_id),
                    interface_number: 0,
                    total_interfaces: 1,
                    status: DeviceStatus::Connected,
                    manufacturer: None,
                    serial_number: None,
                };

                println!("🔄 [RawInput] Converted device: {} ({}:{})",
                    hid_device.name, hid_device.vendor_id, hid_device.product_id);

                let _ = tx.send(hid_device);
                break; // Stop after first detection
            }
        });

        rx
    }

    fn stop_monitoring(&self) {
        self.monitoring_active.store(false, Ordering::SeqCst);
        println!("🛑 [RawInput] Stop monitoring requested");
    }

    fn name(&self) -> &str {
        "RawInput"
    }
}
