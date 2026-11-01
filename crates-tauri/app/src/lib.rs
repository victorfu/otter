//! Tauri application shell: wires plugins, windows and IPC commands.
//! Business logic lives in `otter-core`; this crate only adapts it to Tauri.

mod commands;
mod error;
mod updater;

use tauri::Manager;
use tauri_plugin_log::{RotationStrategy, Target, TargetKind};

pub use error::CommandError;

/// `true` when compiled with debug assertions (i.e. `npm start`).
pub const IS_DEV: bool = cfg!(debug_assertions);

pub fn run() {
    let mut builder = tauri::Builder::default();

    // Must be the first plugin: a second launch focuses the running window and exits.
    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            log::info!("Second instance launched with {argv:?}; focusing main window");
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.show();
                let _ = window.set_focus();
            }
        }));
    }

    builder
        .plugin(log_plugin())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            commands::app_info,
            commands::app_paths,
            commands::system_info,
            commands::greet,
            updater::check_update,
            updater::install_update,
        ])
        .setup(|app| {
            log::info!(
                "{} v{} starting ({} build, identifier {})",
                app.package_info().name,
                app.package_info().version,
                if IS_DEV { "dev" } else { "release" },
                app.config().identifier,
            );
            // The window list lives only in tauri.conf.json; take the title from
            // the (dev or release) product name so both flavours stay correct.
            if let Some(window) = app.get_webview_window("main") {
                window.set_title(&app.package_info().name)?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// Dev builds log to the terminal (and the webview console);
/// release builds write rotating files to the platform log directory.
fn log_plugin<R: tauri::Runtime>() -> tauri::plugin::TauriPlugin<R> {
    let targets = if IS_DEV {
        vec![
            Target::new(TargetKind::Stdout),
            Target::new(TargetKind::Webview),
        ]
    } else {
        vec![Target::new(TargetKind::LogDir { file_name: None })]
    };
    tauri_plugin_log::Builder::new()
        .clear_targets()
        .targets(targets)
        .level(if IS_DEV {
            log::LevelFilter::Debug
        } else {
            log::LevelFilter::Info
        })
        // Dependencies are noisy at debug level.
        .level_for("tao", log::LevelFilter::Info)
        .level_for("wry", log::LevelFilter::Info)
        .level_for("reqwest", log::LevelFilter::Info)
        .level_for("hyper_util", log::LevelFilter::Info)
        .max_file_size(5 * 1024 * 1024)
        .rotation_strategy(RotationStrategy::KeepSome(5))
        .build()
}
