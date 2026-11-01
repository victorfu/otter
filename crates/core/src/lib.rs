//! Core business logic for MyApp.
//!
//! This crate is deliberately free of any Tauri dependency so it can be unit
//! tested (and reused, e.g. from a CLI) without a webview. Types that cross the
//! IPC boundary derive [`ts_rs::TS`]; `cargo test` regenerates their
//! TypeScript definitions in `apps/client/src/bindings/`.

pub mod greeting;
pub mod system;

pub use greeting::{GreetError, Greeting, greet};
pub use system::{SystemInfo, system_info};
