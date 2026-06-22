#[cfg(target_os = "linux")]
use std::io::Read;
use std::process::Command;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[tauri::command]
#[cfg(target_os = "windows")]
pub fn get_device_id() -> Result<String, String> {
    let output = Command::new("wmic")
        .arg("csproduct")
        .arg("get")
        .arg("uuid")
        .creation_flags(0x08000000) // CREATE_NO_WINDOW
        .output()
        .map_err(|e| format!("Failed to execute wmic: {e}"))?;
    let stdout = String::from_utf8_lossy(&output.stdout);
    let uuid = stdout.trim().lines().last().unwrap_or("").to_string();
    Ok(uuid)
}

#[tauri::command]
#[cfg(target_os = "macos")]
pub fn get_device_id() -> Result<String, String> {
    let output = Command::new("system_profiler")
        .arg("SPHardwareDataType")
        .output()
        .map_err(|e| format!("Failed to execute system_profiler: {e}"))?;
    if !output.status.success() {
        return Err("Failed to get device id".to_string());
    }
    let stdout = String::from_utf8_lossy(&output.stdout);
    for line in stdout.lines() {
        if line.trim().starts_with("Hardware UUID") {
            let parts: Vec<&str> = line.split(':').collect();
            if parts.len() > 1 {
                let uuid = parts[1].trim();
                return Ok(uuid.to_string());
            }
        }
    }
    Err("Failed to get device id".to_string())
}

#[tauri::command]
#[cfg(target_os = "linux")]
pub fn get_device_id() -> Result<String, String> {
    let mut file = std::fs::File::open("/etc/machine-id")
        .map_err(|e| format!("Failed to open /etc/machine-id: {e}"))?;
    let mut contents = String::new();
    file.read_to_string(&mut contents)
        .map_err(|e| format!("Failed to read /etc/machine-id: {e}"))?;
    Ok(contents.trim().to_string())
}

#[tauri::command]
#[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
pub fn get_device_id() -> Result<String, String> {
    Err("Unsupported platform".to_string())
}

#[tauri::command]
#[cfg(target_os = "linux")]
pub fn get_distribution() -> Result<String, String> {
    let mut file = std::fs::File::open("/etc/os-release")
        .map_err(|e| format!("Failed to open /etc/os-release: {e}"))?;
    let mut contents = String::new();
    file.read_to_string(&mut contents)
        .map_err(|e| format!("Failed to read /etc/os-release: {e}"))?;
    for line in contents.lines() {
        if line.starts_with("ID=") {
            let distro = line.trim_start_matches("ID=").trim_matches('"');
            return Ok(distro.to_string());
        }
    }
    Err("Failed to get distribution".to_string())
}
