use serde::Serialize;
use ts_rs::TS;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct SystemInfo {
    /// Rust target OS, e.g. `windows`, `macos`, `linux`.
    pub os: String,
    /// Human-friendly OS name, e.g. `Windows 10 Pro`, `Mac OS`, `Ubuntu`.
    pub os_name: String,
    pub os_version: String,
    /// CPU architecture of this build, e.g. `x86_64`, `aarch64`.
    pub arch: String,
    pub family: String,
    #[ts(type = "number")]
    pub cpu_count: usize,
}

/// Collect information about the host operating system.
pub fn system_info() -> SystemInfo {
    let info = os_info::get();
    let os_name = match info.edition() {
        Some(edition) if !edition.is_empty() => edition.to_owned(),
        _ => info.os_type().to_string(),
    };
    SystemInfo {
        os: std::env::consts::OS.to_owned(),
        os_name,
        os_version: info.version().to_string(),
        arch: std::env::consts::ARCH.to_owned(),
        family: std::env::consts::FAMILY.to_owned(),
        cpu_count: std::thread::available_parallelism().map_or(1, usize::from),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reports_current_platform() {
        let info = system_info();
        assert_eq!(info.os, std::env::consts::OS);
        assert_eq!(info.arch, std::env::consts::ARCH);
        assert!(!info.os_name.is_empty());
        assert!(info.cpu_count >= 1);
    }
}
