// ============================================
// Hotkey Simulation Module
// Uses Windows SendInput API to simulate keyboard input
// ============================================

use std::collections::HashMap;

#[cfg(target_os = "windows")]
use windows::Win32::UI::Input::KeyboardAndMouse::{
    SendInput, INPUT, INPUT_0, INPUT_KEYBOARD, KEYBDINPUT, KEYEVENTF_KEYUP, VIRTUAL_KEY,
    VK_CONTROL, VK_MENU, VK_SHIFT, VK_LWIN,
};

/// Parse hotkey string like "Ctrl+Shift+V" and simulate key press
/// Returns Ok(()) on success, Err with description on failure
pub fn execute_hotkey(hotkey_str: &str) -> Result<(), String> {
    log::info!("Executing hotkey: {}", hotkey_str);

    #[cfg(target_os = "windows")]
    {
        let keys = parse_hotkey(hotkey_str)?;
        send_keys(&keys)?;
        Ok(())
    }

    #[cfg(not(target_os = "windows"))]
    {
        Err("Hotkey simulation is only supported on Windows".to_string())
    }
}

/// Parse hotkey string into virtual key codes
/// Supports: Ctrl, Alt, Shift, Win + any letter/number/F-key
#[cfg(target_os = "windows")]
fn parse_hotkey(hotkey_str: &str) -> Result<Vec<u16>, String> {
    let mut keys = Vec::new();
    let parts: Vec<&str> = hotkey_str.split('+').map(|s| s.trim()).collect();

    if parts.is_empty() {
        return Err("Empty hotkey string".to_string());
    }

    let key_map = build_key_map();

    for part in parts {
        let upper = part.to_uppercase();
        if let Some(&vk) = key_map.get(upper.as_str()) {
            keys.push(vk);
        } else if upper.len() == 1 {
            // Single character - use ASCII value for A-Z and 0-9
            let c = upper.chars().next().unwrap();
            if c.is_ascii_alphanumeric() {
                keys.push(c as u16);
            } else {
                return Err(format!("Unsupported key: {}", part));
            }
        } else {
            return Err(format!("Unknown key: {}", part));
        }
    }

    Ok(keys)
}

/// Build mapping of key names to virtual key codes
#[cfg(target_os = "windows")]
fn build_key_map() -> HashMap<&'static str, u16> {
    let mut map = HashMap::new();

    // Modifiers
    map.insert("CTRL", VK_CONTROL.0);
    map.insert("CONTROL", VK_CONTROL.0);
    map.insert("ALT", VK_MENU.0);
    map.insert("SHIFT", VK_SHIFT.0);
    map.insert("WIN", VK_LWIN.0);
    map.insert("WINDOWS", VK_LWIN.0);
    map.insert("META", VK_LWIN.0);

    // Function keys
    for i in 1..=24 {
        let key = format!("F{}", i);
        map.insert(Box::leak(key.into_boxed_str()), 0x70 + (i - 1) as u16); // VK_F1 = 0x70
    }

    // Special keys
    map.insert("ENTER", 0x0D);
    map.insert("RETURN", 0x0D);
    map.insert("TAB", 0x09);
    map.insert("ESCAPE", 0x1B);
    map.insert("ESC", 0x1B);
    map.insert("SPACE", 0x20);
    map.insert("BACKSPACE", 0x08);
    map.insert("DELETE", 0x2E);
    map.insert("DEL", 0x2E);
    map.insert("INSERT", 0x2D);
    map.insert("INS", 0x2D);
    map.insert("HOME", 0x24);
    map.insert("END", 0x23);
    map.insert("PAGEUP", 0x21);
    map.insert("PAGEDOWN", 0x22);
    map.insert("UP", 0x26);
    map.insert("DOWN", 0x28);
    map.insert("LEFT", 0x25);
    map.insert("RIGHT", 0x27);
    map.insert("PRINTSCREEN", 0x2C);
    map.insert("PRTSC", 0x2C);
    map.insert("PAUSE", 0x13);
    map.insert("CAPSLOCK", 0x14);
    map.insert("NUMLOCK", 0x90);
    map.insert("SCROLLLOCK", 0x91);

    // Media keys
    map.insert("VOLUMEUP", 0xAF);
    map.insert("VOLUMEDOWN", 0xAE);
    map.insert("VOLUMEMUTE", 0xAD);
    map.insert("MUTE", 0xAD);
    map.insert("PLAYPAUSE", 0xB3);
    map.insert("STOP", 0xB2);
    map.insert("NEXTTRACK", 0xB0);
    map.insert("PREVTRACK", 0xB1);

    map
}

/// Send key combination using SendInput
/// First presses all keys down, then releases them in reverse order
#[cfg(target_os = "windows")]
fn send_keys(keys: &[u16]) -> Result<(), String> {
    if keys.is_empty() {
        return Err("No keys to send".to_string());
    }

    let mut inputs: Vec<INPUT> = Vec::new();

    // Press all keys down
    for &vk in keys {
        inputs.push(create_key_input(vk, false));
    }

    // Release all keys in reverse order
    for &vk in keys.iter().rev() {
        inputs.push(create_key_input(vk, true));
    }

    unsafe {
        let sent = SendInput(&inputs, std::mem::size_of::<INPUT>() as i32);
        if sent != inputs.len() as u32 {
            return Err(format!(
                "SendInput failed: sent {} of {} inputs",
                sent,
                inputs.len()
            ));
        }
    }

    log::info!("Hotkey executed successfully: {} keys", keys.len());
    Ok(())
}

/// Create INPUT structure for a key event
#[cfg(target_os = "windows")]
fn create_key_input(vk: u16, key_up: bool) -> INPUT {
    INPUT {
        r#type: INPUT_KEYBOARD,
        Anonymous: INPUT_0 {
            ki: KEYBDINPUT {
                wVk: VIRTUAL_KEY(vk),
                wScan: 0,
                dwFlags: if key_up { KEYEVENTF_KEYUP } else { Default::default() },
                time: 0,
                dwExtraInfo: 0,
            },
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[cfg(target_os = "windows")]
    fn test_parse_hotkey() {
        let keys = parse_hotkey("Ctrl+Shift+V").unwrap();
        assert_eq!(keys.len(), 3);
        assert_eq!(keys[0], VK_CONTROL.0);
        assert_eq!(keys[1], VK_SHIFT.0);
        assert_eq!(keys[2], 'V' as u16);
    }

    #[test]
    #[cfg(target_os = "windows")]
    fn test_parse_single_key() {
        let keys = parse_hotkey("F1").unwrap();
        assert_eq!(keys.len(), 1);
        assert_eq!(keys[0], 0x70); // VK_F1
    }

    #[test]
    fn test_empty_hotkey() {
        let result = parse_hotkey("");
        assert!(result.is_err());
    }
}
