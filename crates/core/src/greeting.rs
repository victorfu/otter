use serde::Serialize;
use ts_rs::TS;

/// Maximum accepted name length, in characters.
pub const MAX_NAME_LEN: usize = 40;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct Greeting {
    /// The trimmed name that was greeted.
    pub name: String,
    pub message: String,
}

#[derive(Debug, Clone, PartialEq, Eq, thiserror::Error)]
pub enum GreetError {
    #[error("Please enter a name.")]
    EmptyName,
    #[error("That name is too long ({len} characters, max {max}).")]
    TooLong { len: usize, max: usize },
    #[error("Names cannot contain control characters.")]
    InvalidCharacters,
}

impl GreetError {
    /// Stable machine-readable code for the frontend.
    pub fn code(&self) -> &'static str {
        match self {
            Self::EmptyName => "EMPTY_NAME",
            Self::TooLong { .. } => "NAME_TOO_LONG",
            Self::InvalidCharacters => "INVALID_CHARACTERS",
        }
    }
}

/// Validate `name` and build a greeting for it.
pub fn greet(name: &str) -> Result<Greeting, GreetError> {
    let name = name.trim();
    if name.is_empty() {
        return Err(GreetError::EmptyName);
    }
    let len = name.chars().count();
    if len > MAX_NAME_LEN {
        return Err(GreetError::TooLong {
            len,
            max: MAX_NAME_LEN,
        });
    }
    if name.chars().any(char::is_control) {
        return Err(GreetError::InvalidCharacters);
    }
    Ok(Greeting {
        name: name.to_owned(),
        message: format!("Hello, {name}! This greeting was computed in Rust by the core crate."),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn greets_trimmed_name() {
        let g = greet("  Ada  ").unwrap();
        assert_eq!(g.name, "Ada");
        assert!(g.message.starts_with("Hello, Ada!"));
    }

    #[test]
    fn rejects_empty_and_whitespace() {
        assert_eq!(greet(""), Err(GreetError::EmptyName));
        assert_eq!(greet(" \t\n"), Err(GreetError::EmptyName));
    }

    #[test]
    fn counts_characters_not_bytes() {
        let name = "貓".repeat(MAX_NAME_LEN);
        assert!(greet(&name).is_ok());
        let too_long = "貓".repeat(MAX_NAME_LEN + 1);
        assert_eq!(
            greet(&too_long),
            Err(GreetError::TooLong {
                len: MAX_NAME_LEN + 1,
                max: MAX_NAME_LEN
            })
        );
    }

    #[test]
    fn rejects_control_characters() {
        assert_eq!(greet("Ada\u{0007}"), Err(GreetError::InvalidCharacters));
    }

    #[test]
    fn serializes_camel_case() {
        let json = serde_json::to_value(greet("Ada").unwrap()).unwrap();
        assert_eq!(json["name"], "Ada");
        assert!(json["message"].is_string());
    }
}
