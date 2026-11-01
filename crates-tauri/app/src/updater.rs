use serde::Serialize;
use tauri::{AppHandle, Runtime};
use tauri_plugin_updater::UpdaterExt;
use ts_rs::TS;

use crate::CommandError;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, TS)]
#[serde(
    tag = "status",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
#[ts(export)]
pub enum UpdateStatus {
    /// No usable update source (dev build, or placeholder endpoint / key).
    NotConfigured {
        reason: String,
    },
    UpToDate {
        current_version: String,
    },
    Available {
        current_version: String,
        version: String,
        notes: Option<String>,
        date: Option<String>,
    },
}

/// Hosts that mark an endpoint as an unreplaced placeholder.
const PLACEHOLDER_HOSTS: &[&str] = &["example.com", "example.org", "example.net"];

/// Returns why the updater cannot be used, or `None` when it is configured.
fn config_problem(updater_config: Option<&serde_json::Value>) -> Option<String> {
    let Some(cfg) = updater_config else {
        return Some("The updater plugin has no configuration.".into());
    };
    let endpoints: Vec<&str> = cfg
        .get("endpoints")
        .and_then(|v| v.as_array())
        .map(|a| a.iter().filter_map(|e| e.as_str()).collect())
        .unwrap_or_default();
    if endpoints.is_empty() {
        return Some("No update source is configured for this build.".into());
    }
    if cfg
        .get("pubkey")
        .and_then(|v| v.as_str())
        .is_none_or(|k| k.trim().is_empty())
    {
        return Some("No updater public key is configured.".into());
    }
    let is_placeholder = |url: &str| {
        let host = url
            .split("://")
            .nth(1)
            .and_then(|rest| rest.split(['/', ':']).next())
            .unwrap_or_default();
        PLACEHOLDER_HOSTS
            .iter()
            .any(|p| host == *p || host.ends_with(&format!(".{p}")))
    };
    if let Some(url) = endpoints.iter().find(|u| is_placeholder(u)) {
        return Some(format!("The update source is still a placeholder ({url})."));
    }
    None
}

fn problem_for<R: Runtime>(app: &AppHandle<R>) -> Option<String> {
    config_problem(app.config().plugins.0.get("updater"))
}

#[tauri::command]
pub async fn check_update<R: Runtime>(app: AppHandle<R>) -> Result<UpdateStatus, CommandError> {
    let current_version = app.package_info().version.to_string();
    if let Some(reason) = problem_for(&app) {
        log::info!("Update check skipped: {reason}");
        return Ok(UpdateStatus::NotConfigured { reason });
    }
    log::info!("Checking for updates (current v{current_version})");
    match app.updater()?.check().await? {
        Some(update) => Ok(UpdateStatus::Available {
            current_version,
            version: update.version.clone(),
            notes: update.body.clone(),
            date: update.date.map(|d| d.to_string()),
        }),
        None => Ok(UpdateStatus::UpToDate { current_version }),
    }
}

/// Downloads and installs the pending update, then restarts the app.
#[tauri::command]
pub async fn install_update<R: Runtime>(app: AppHandle<R>) -> Result<(), CommandError> {
    if let Some(reason) = problem_for(&app) {
        return Err(CommandError::new("UPDATER_NOT_CONFIGURED", reason));
    }
    let Some(update) = app.updater()?.check().await? else {
        return Err(CommandError::new("NO_UPDATE", "No update is available."));
    };
    log::info!("Installing update v{}", update.version);
    update.download_and_install(|_, _| {}, || {}).await?;
    log::info!("Update installed; restarting");
    app.restart();
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn missing_or_empty_config_is_not_configured() {
        assert!(config_problem(None).is_some());
        assert!(config_problem(Some(&json!({ "pubkey": "", "endpoints": [] }))).is_some());
        assert!(
            config_problem(Some(
                &json!({ "pubkey": "", "endpoints": ["https://a.dev/x"] })
            ))
            .is_some()
        );
    }

    #[test]
    fn placeholder_endpoint_is_not_configured() {
        let cfg = json!({ "pubkey": "abc", "endpoints": ["https://example.com/latest.json"] });
        assert!(config_problem(Some(&cfg)).unwrap().contains("placeholder"));
        let cfg = json!({ "pubkey": "abc", "endpoints": ["https://updates.example.com/l.json"] });
        assert!(config_problem(Some(&cfg)).is_some());
    }

    #[test]
    fn real_endpoint_is_configured() {
        let cfg = json!({
            "pubkey": "abc",
            "endpoints": ["https://github.com/acme/app/releases/latest/download/latest.json"]
        });
        assert_eq!(config_problem(Some(&cfg)), None);
    }

    #[test]
    fn status_serializes_with_tag() {
        let json = serde_json::to_value(UpdateStatus::UpToDate {
            current_version: "1.0.0".into(),
        })
        .unwrap();
        assert_eq!(
            json,
            json!({ "status": "upToDate", "currentVersion": "1.0.0" })
        );
    }
}
