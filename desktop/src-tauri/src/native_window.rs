use objc2_app_kit::NSWindow;
use tauri::WebviewWindow;

/// Run `f` against the window's `NSWindow` on the main thread.
///
/// AppKit traps ("Must only be used from the main thread") when a window is touched from any
/// other thread, and async Tauri commands run on tokio workers. Tauri's own window methods hop to
/// the main thread themselves; raw `NSWindow` calls have to be sent there explicitly.
pub fn with_ns_window(window: &WebviewWindow, f: impl FnOnce(&NSWindow) + Send + 'static) {
    let target = window.clone();
    let scheduled = window.run_on_main_thread(move || match target.ns_window() {
        // SAFETY: Tauri hands out the window's live NSWindow, and this runs on the main thread.
        Ok(pointer) => f(unsafe { &*pointer.cast::<NSWindow>() }),
        Err(error) => tracing::error!("Could not reach the native window {}: {error}", target.label()),
    });
    if let Err(error) = scheduled {
        tracing::error!("Could not schedule a native window update for {}: {error}", window.label());
    }
}
