use serde::Serialize;
use ts_rs::TS;

/// Error shape returned by every fallible command. The frontend receives it as
/// the rejection value of `invoke()`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, TS, thiserror::Error)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
#[error("{code}: {message}")]
pub struct CommandError {
    /// Stable machine-readable code, e.g. `EMPTY_NAME`, `UPDATER`.
    pub code: String,
    /// Human-readable message, safe to show in the UI.
    pub message: String,
}

impl CommandError {
    pub fn new(code: impl Into<String>, message: impl ToString) -> Self {
        Self {
            code: code.into(),
            message: message.to_string(),
        }
    }
}

impl From<myapp_core::GreetError> for CommandError {
    fn from(err: myapp_core::GreetError) -> Self {
        Self::new(err.code(), err)
    }
}

impl From<tauri::Error> for CommandError {
    fn from(err: tauri::Error) -> Self {
        Self::new("TAURI", err)
    }
}

impl From<tauri_plugin_updater::Error> for CommandError {
    fn from(err: tauri_plugin_updater::Error) -> Self {
        Self::new("UPDATER", err)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn maps_core_errors_to_stable_codes() {
        let err: CommandError = myapp_core::GreetError::EmptyName.into();
        assert_eq!(err.code, "EMPTY_NAME");
        assert_eq!(err.message, "Please enter a name.");
    }

    #[test]
    fn serializes_as_plain_object() {
        let json = serde_json::to_value(CommandError::new("X", "boom")).unwrap();
        assert_eq!(json, serde_json::json!({ "code": "X", "message": "boom" }));
    }
}
