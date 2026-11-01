use serde::Serialize;
use tauri::{AppHandle, Manager, Runtime};
use ts_rs::TS;

use crate::{CommandError, IS_DEV};

#[derive(Debug, Clone, Serialize, TS)]
#[serde(rename_all = "lowercase")]
#[ts(export)]
pub enum BuildType {
    Dev,
    Release,
}

#[derive(Debug, Clone, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct AppInfo {
    pub name: String,
    pub version: String,
    pub identifier: String,
    pub build_type: BuildType,
    pub tauri_version: String,
}

#[derive(Debug, Clone, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct AppPaths {
    pub data_dir: String,
    pub config_dir: String,
    pub log_dir: String,
}

#[tauri::command]
pub fn app_info<R: Runtime>(app: AppHandle<R>) -> AppInfo {
    let pkg = app.package_info();
    AppInfo {
        name: pkg.name.clone(),
        version: pkg.version.to_string(),
        identifier: app.config().identifier.clone(),
        build_type: if IS_DEV {
            BuildType::Dev
        } else {
            BuildType::Release
        },
        tauri_version: tauri::VERSION.to_owned(),
    }
}

/// Per-identifier directories; dev (`*.dev`) and release never share them.
#[tauri::command]
pub fn app_paths<R: Runtime>(app: AppHandle<R>) -> Result<AppPaths, CommandError> {
    let paths = app.path();
    let display = |p: std::path::PathBuf| p.display().to_string();
    Ok(AppPaths {
        data_dir: display(paths.app_data_dir()?),
        config_dir: display(paths.app_config_dir()?),
        log_dir: display(paths.app_log_dir()?),
    })
}

#[tauri::command]
pub fn system_info() -> myapp_core::SystemInfo {
    myapp_core::system_info()
}

/// Frontend → Tauri command → core crate, with validation errors mapped to
/// [`CommandError`].
#[tauri::command]
pub fn greet(name: String) -> Result<myapp_core::Greeting, CommandError> {
    log::debug!("greet({name:?})");
    myapp_core::greet(&name).map_err(|err| {
        log::warn!("greet rejected: {err}");
        CommandError::from(err)
    })
}
