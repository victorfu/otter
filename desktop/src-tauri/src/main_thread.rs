//! Running window work on the main thread from anywhere.

use tauri::AppHandle;

/// Run `f` on the main thread and wait for its result; inline when already there.
///
/// Every monitor query goes through here. Tauri fetches a monitor on the main thread but turns it
/// into a `Monitor` on the caller's thread, and on Linux that reads the work area from the X
/// server. From an async command (a tokio worker) or a background thread, two threads then talk
/// to Xlib at once and GTK aborts with BadImplementation; clicking the floating dock ball did.
///
/// Do not build webview windows inside `f`: that deadlocks on Windows.
pub fn on_main_thread<T: Send + 'static>(
    app: &AppHandle,
    f: impl FnOnce(&AppHandle) -> Result<T, String> + Send + 'static,
) -> Result<T, String> {
    let (tx, rx) = std::sync::mpsc::channel();
    let handle = app.clone();
    app.run_on_main_thread(move || {
        let _ = tx.send(f(&handle));
    })
    .map_err(|error| error.to_string())?;
    rx.recv().map_err(|error| error.to_string())?
}
