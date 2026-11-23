//! The floating dock: a small always-on-top button on the desktop. It only sends actions to the
//! main window; recording, dictation and transcription still run there.
//!
//! The ball and its menu are two windows. The ball's window never moves or resizes when the menu
//! opens: resizing a webview window briefly shows its previous frame at the new origin, which drew
//! a second ball beside the first. The menu window keeps one size and is moved while hidden.

use crate::config::STORE_FILENAME;
use crate::main_thread::on_main_thread;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, LogicalSize, Manager, Monitor, PhysicalPosition, WebviewUrl, WebviewWindow, WebviewWindowBuilder};
use tauri_plugin_store::StoreExt;

const BALL_LABEL: &str = "floating-dock";
const MENU_LABEL: &str = "floating-dock-menu";
/// Config keys, shared with the frontend.
const ENABLED_KEY: &str = "floatingDock.enabled";
const POSITION_KEY: &str = "floatingDock.position";
pub const ENABLED_EVENT: &str = "floating-dock-enabled";
/// Tells both dock windows whether the menu is showing.
const MENU_VISIBLE_EVENT: &str = "floating-dock-menu-visible";
/// Logical pixels.
const BALL: f64 = 56.0;
const MENU_WIDTH: f64 = 248.0;
/// Until the menu window reports its height. Six 40px rows plus padding and border.
const DEFAULT_MENU_HEIGHT: f64 = 254.0;
const GAP: f64 = 8.0;
const EDGE: f64 = 8.0;
/// Transparent margin around the menu so its shadow is not clipped into a square. Must match `PAD`
/// in the menu window.
const PAD: f64 = 12.0;
/// The ball window is exactly the ball: no transparent margin around it to catch clicks.
const SLOT: f64 = BALL;

pub struct FloatingDockRuntime {
    /// The menu's content height in logical pixels, reported by the menu window once it has rendered.
    menu_height: Mutex<f64>,
    /// We are moving the ball with the pointer ourselves (Linux X11, see `linux::drag`).
    #[cfg_attr(not(target_os = "linux"), allow(dead_code))]
    dragging: AtomicBool,
}

impl Default for FloatingDockRuntime {
    fn default() -> Self {
        Self { menu_height: Mutex::new(DEFAULT_MENU_HEIGHT), dragging: AtomicBool::new(false) }
    }
}

pub fn is_enabled(app: &AppHandle) -> bool {
    app.store(STORE_FILENAME)
        .ok()
        .and_then(|store| store.get(ENABLED_KEY))
        .and_then(|value| value.as_bool())
        .unwrap_or(false)
}

fn saved_position(app: &AppHandle) -> Option<(i32, i32)> {
    let value = app.store(STORE_FILENAME).ok()?.get(POSITION_KEY)?;
    Some((value.get("x")?.as_i64()? as i32, value.get("y")?.as_i64()? as i32))
}

fn work_area(monitor: &Monitor) -> Rect {
    let area = monitor.work_area();
    Rect {
        x: area.position.x as f64,
        y: area.position.y as f64,
        w: area.size.width as f64,
        h: area.size.height as f64,
    }
}

/// The monitor under the point, falling back to the window's own and then the primary one.
/// Main thread only; see `crate::main_thread::on_main_thread`.
fn monitor_at(window: &WebviewWindow, x: f64, y: f64) -> Result<Monitor, String> {
    window
        .monitor_from_point(x, y)
        .ok()
        .flatten()
        .or_else(|| window.current_monitor().ok().flatten())
        .or_else(|| window.primary_monitor().ok().flatten())
        .ok_or_else(|| "no monitor to place the floating dock on".to_string())
}

/// A transparent, always-on-top window that never takes focus: clicking the dock must leave the
/// app the user is typing in focused, or dictation would type into the wrong place.
///
/// `position` (logical pixels) makes the window visible from the start. On Windows the webview
/// registers its file-drop target while it is being built, and a window built hidden has no
/// WebView2 child window to register on yet, so it never accepts dropped files.
fn build_dock_window(
    app: &AppHandle,
    label: &str,
    page: &str,
    width: f64,
    height: f64,
    position: Option<(f64, f64)>,
) -> Result<WebviewWindow, String> {
    let mut builder = WebviewWindowBuilder::new(app, label, WebviewUrl::App(format!("index.html?window={page}").into()));
    if let Some((x, y)) = position {
        builder = builder.position(x, y);
    }
    // GTK ignores the requested size of a non-resizable window and gives it at least 200x200,
    // which left an invisible square catching clicks around the ball.
    // Linux therefore pins the size with equal min and max sizes instead.
    #[cfg(target_os = "linux")]
    {
        builder = builder.min_inner_size(width, height).max_inner_size(width, height);
    }
    let window = builder
        .inner_size(width, height)
        .decorations(false)
        .resizable(cfg!(target_os = "linux"))
        .always_on_top(true)
        .visible_on_all_workspaces(true)
        .focused(false)
        .focusable(false)
        .accept_first_mouse(true)
        .skip_taskbar(true)
        .transparent(true)
        .shadow(false)
        // Linux shows it below, once it is override-redirect (see `linux::float_above_panels`).
        .visible(position.is_some() && !cfg!(target_os = "linux"))
        .on_navigation(crate::setup::navigation_guard(app))
        .build()
        .map_err(|error| error.to_string())?;

    #[cfg(target_os = "linux")]
    {
        let dock = window.clone();
        let show = position.is_some();
        on_main_thread(app, move |_| {
            linux::float_above_panels(&dock);
            if show {
                dock.show().map_err(|error| error.to_string())?;
            }
            Ok(())
        })?;
    }

    #[cfg(target_os = "macos")]
    crate::native_window::with_ns_window(&window, |native_window| {
        use objc2_app_kit::{NSStatusWindowLevel, NSWindowCollectionBehavior};

        native_window.setCollectionBehavior(
            native_window.collectionBehavior()
                | NSWindowCollectionBehavior::CanJoinAllSpaces
                | NSWindowCollectionBehavior::FullScreenAuxiliary,
        );
        native_window.setLevel(NSStatusWindowLevel);
        native_window.setOpaque(false);
    });
    Ok(window)
}

/// The ball is built visible at its place (see `build_dock_window`) so it accepts dropped files.
fn create_ball_window(app: &AppHandle) -> Result<WebviewWindow, String> {
    // The window itself is built here, not on the main thread: building a webview window from a
    // main-thread callback deadlocks on Windows.
    let (x, y, scale) = on_main_thread(app, |app| {
        let primary = app
            .primary_monitor()
            .ok()
            .flatten()
            .ok_or_else(|| "no monitor to place the floating dock on".to_string())?;
        let work_areas: Vec<Rect> = app
            .available_monitors()
            .map_err(|error| error.to_string())?
            .iter()
            .map(work_area)
            .collect();
        let scale = primary.scale_factor();
        let (x, y) = restore_position(saved_position(app), SLOT * scale, &work_areas, work_area(&primary), EDGE * scale);
        Ok((x, y, scale))
    })?;
    let window = build_dock_window(app, BALL_LABEL, "floating-dock", SLOT, SLOT, Some((x / scale, y / scale)))?;
    // The builder takes logical pixels; set the exact physical spot in case the monitor's scale differs.
    window
        .set_position(PhysicalPosition::new(x.round() as i32, y.round() as i32))
        .map_err(|error| error.to_string())?;
    Ok(window)
}

/// The menu window is created hidden with the ball, so it has rendered before the first click.
fn create_menu_window(app: &AppHandle) -> Result<WebviewWindow, String> {
    let height = *app
        .state::<FloatingDockRuntime>()
        .menu_height
        .lock()
        .map_err(|error| error.to_string())?;
    build_dock_window(app, MENU_LABEL, "floating-dock-menu", MENU_WIDTH + 2.0 * PAD, height + 2.0 * PAD, None)
}

fn create_windows(app: &AppHandle) -> Result<(), String> {
    if app.get_webview_window(MENU_LABEL).is_none() {
        create_menu_window(app)?;
    }
    if app.get_webview_window(BALL_LABEL).is_none() {
        create_ball_window(app)?;
    }
    Ok(())
}

pub fn initialize(app: &AppHandle) {
    if is_enabled(app) {
        if let Err(error) = create_windows(app) {
            tracing::error!("Could not create the floating dock: {error}");
        }
    }
}

/// Turn the dock on or off from anywhere (settings, tray, the dock's own menu).
pub fn set_enabled(app: &AppHandle, enabled: bool) -> Result<(), String> {
    let store = app.store(STORE_FILENAME).map_err(|error| error.to_string())?;
    store.set(ENABLED_KEY, serde_json::Value::Bool(enabled));
    store.save().map_err(|error| error.to_string())?;
    if enabled {
        create_windows(app)?;
    } else {
        for label in [MENU_LABEL, BALL_LABEL] {
            if let Some(window) = app.get_webview_window(label) {
                window.close().map_err(|error| error.to_string())?;
            }
        }
    }
    crate::tray::sync_floating_dock(app, enabled);
    app.emit(ENABLED_EVENT, enabled).map_err(|error| error.to_string())
}

fn hide_menu(app: &AppHandle) -> Result<(), String> {
    if let Some(menu) = app.get_webview_window(MENU_LABEL) {
        if menu.is_visible().unwrap_or(false) {
            menu.hide().map_err(|error| error.to_string())?;
        }
    }
    app.emit(MENU_VISIBLE_EVENT, false).map_err(|error| error.to_string())
}

/// Place the menu next to the ball (below and to the right when it fits) and show it.
fn show_menu(app: &AppHandle) -> Result<(), String> {
    let ball = app
        .get_webview_window(BALL_LABEL)
        .ok_or_else(|| "the floating dock is not showing".to_string())?;
    let menu = match app.get_webview_window(MENU_LABEL) {
        Some(menu) => menu,
        None => create_menu_window(app)?,
    };
    on_main_thread(app, move |app| place_and_show_menu(app, &ball, &menu))
}

/// Where a dock window is, in physical pixels. Main thread only.
fn dock_position(window: &WebviewWindow) -> Result<PhysicalPosition<i32>, String> {
    #[cfg(target_os = "linux")]
    if let Some(position) = linux::position(window) {
        return Ok(position);
    }
    window.outer_position().map_err(|error| error.to_string())
}

fn place_and_show_menu(app: &AppHandle, ball: &WebviewWindow, menu: &WebviewWindow) -> Result<(), String> {
    let position = dock_position(ball)?;
    let probe = ball.scale_factor().map_err(|error| error.to_string())?;
    let monitor = monitor_at(ball, position.x as f64 + SLOT * probe / 2.0, position.y as f64 + SLOT * probe / 2.0)?;
    let scale = monitor.scale_factor();
    let height = *app
        .state::<FloatingDockRuntime>()
        .menu_height
        .lock()
        .map_err(|error| error.to_string())?;
    let ball_rect = Rect {
        x: position.x as f64,
        y: position.y as f64,
        w: BALL * scale,
        h: BALL * scale,
    };
    let frame = menu_frame(ball_rect, MENU_WIDTH * scale, height * scale, GAP * scale, work_area(&monitor)).inflate(PAD * scale);
    menu.set_position(PhysicalPosition::new(frame.x.round() as i32, frame.y.round() as i32))
        .map_err(|error| error.to_string())?;
    menu.show().map_err(|error| error.to_string())?;
    #[cfg(target_os = "macos")]
    crate::native_window::with_ns_window(&menu, |native_window| native_window.orderFrontRegardless());
    app.emit(MENU_VISIBLE_EVENT, true).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn get_floating_dock_enabled(app: AppHandle) -> bool {
    is_enabled(&app)
}

/// Async on purpose: creating a webview window from a synchronous command deadlocks on Windows.
#[tauri::command]
pub async fn set_floating_dock_enabled(app: AppHandle, enabled: bool) -> Result<(), String> {
    set_enabled(&app, enabled)
}

/// Open the menu, or close it when it is already open. Async because it may create the window.
#[tauri::command]
pub async fn toggle_floating_dock_menu(app: AppHandle) -> Result<(), String> {
    let visible = app
        .get_webview_window(MENU_LABEL)
        .and_then(|menu| menu.is_visible().ok())
        .unwrap_or(false);
    if visible {
        hide_menu(&app)
    } else {
        show_menu(&app)
    }
}

#[tauri::command]
pub fn hide_floating_dock_menu(app: AppHandle) -> Result<(), String> {
    hide_menu(&app)
}

/// The menu window reports its rendered height (logical pixels) so its window fits it exactly.
#[tauri::command]
pub fn floating_dock_menu_ready(
    window: WebviewWindow,
    runtime: tauri::State<'_, FloatingDockRuntime>,
    height: f64,
) -> Result<(), String> {
    *runtime.menu_height.lock().map_err(|error| error.to_string())? = height;
    set_fixed_size(&window, MENU_WIDTH + 2.0 * PAD, height + 2.0 * PAD)
}

/// Resize a dock window. On Linux the window is pinned by equal min and max sizes instead of
/// `resizable(false)` (see `build_dock_window`), so those move with it.
fn set_fixed_size(window: &WebviewWindow, width: f64, height: f64) -> Result<(), String> {
    let size = LogicalSize::new(width, height);
    #[cfg(target_os = "linux")]
    {
        window.set_min_size(None::<LogicalSize<f64>>).map_err(|error| error.to_string())?;
        window.set_max_size(None::<LogicalSize<f64>>).map_err(|error| error.to_string())?;
    }
    window.set_size(size).map_err(|error| error.to_string())?;
    #[cfg(target_os = "linux")]
    {
        window.set_min_size(Some(size)).map_err(|error| error.to_string())?;
        window.set_max_size(Some(size)).map_err(|error| error.to_string())?;
    }
    Ok(())
}

/// Remember where the user dragged the ball. Ignored while we drag it ourselves: the pointer may
/// rest over a panel mid-drag, and the drag saves once the button is released.
#[tauri::command]
pub fn save_floating_dock_position(app: AppHandle, window: WebviewWindow) -> Result<(), String> {
    if app.state::<FloatingDockRuntime>().dragging.load(Ordering::Acquire) {
        return Ok(());
    }
    save_position(&app, &window)
}

/// Drag the ball with the pointer. Closes the menu first: it would be left behind. `grab_x` and
/// `grab_y` are where in the ball (logical pixels) the button went down, so the ball stays under the
/// pointer exactly where it was grabbed.
#[tauri::command]
pub fn start_floating_dock_drag(app: AppHandle, window: WebviewWindow, grab_x: f64, grab_y: f64) -> Result<(), String> {
    #[cfg(not(target_os = "linux"))]
    let _ = (grab_x, grab_y);
    hide_menu(&app)?;
    // Override-redirect windows are not the window manager's to move, and moving the window
    // ourselves follows the pointer more closely than GNOME's own window move did.
    #[cfg(target_os = "linux")]
    {
        let ball = window.clone();
        let dragging = on_main_thread(&app, move |app| {
            if !linux::is_x11() {
                return Ok(false);
            }
            linux::drag(app, ball, (grab_x.round() as i32, grab_y.round() as i32)).map(|()| true)
        })?;
        if dragging {
            return Ok(());
        }
    }
    window.start_dragging().map_err(|error| error.to_string())
}

/// Clamp the ball onto its monitor and store where it is.
fn save_position(app: &AppHandle, window: &WebviewWindow) -> Result<(), String> {
    let window = window.clone();
    let (x, y) = on_main_thread(app, move |_| {
        let position = dock_position(&window)?;
        let scale = window.scale_factor().map_err(|error| error.to_string())?;
        let size = SLOT * scale;
        let work = work_area(&monitor_at(&window, position.x as f64 + size / 2.0, position.y as f64 + size / 2.0)?);
        let (x, y) = clamp_to_work_area(position.x as f64, position.y as f64, size, size, EDGE * scale, work);
        let (x, y) = (x.round() as i32, y.round() as i32);
        if (x, y) != (position.x, position.y) {
            window
                .set_position(PhysicalPosition::new(x, y))
                .map_err(|error| error.to_string())?;
        }
        Ok((x, y))
    })?;
    let store = app.store(STORE_FILENAME).map_err(|error| error.to_string())?;
    store.set(POSITION_KEY, serde_json::json!({ "x": x, "y": y }));
    store.save().map_err(|error| error.to_string())
}

#[cfg(target_os = "linux")]
mod linux {
    use super::FloatingDockRuntime;
    use gtk::gdk::ModifierType;
    use gtk::glib::{self, prelude::*};
    use gtk::prelude::*;
    use std::sync::atomic::Ordering;
    use std::time::Duration;
    use tauri::{AppHandle, Manager, PhysicalPosition, WebviewWindow};

    /// How often a drag follows the pointer: faster than the screen refreshes.
    const DRAG_TICK: Duration = Duration::from_millis(8);

    /// Whether GTK talks to an X server. Wayland lets no window place itself or cover the panels.
    /// Main thread only.
    pub fn is_x11() -> bool {
        gtk::gdk::Display::default().is_some_and(|display| display.type_().name() == "GdkX11Display")
    }

    /// Make a dock window override-redirect, the way menus and tooltips are. GNOME Shell draws its
    /// top bar and dock above every window it manages, always-on-top ones included, but draws
    /// override-redirect windows above its panels, so the ball no longer slides under them. The
    /// shell still takes clicks over its panels, which is why the ball settles inside the work
    /// area. Such a window takes no focus, shows on every workspace and is moved only by us (see
    /// `drag`). The window must not be showing yet.
    /// Main thread only.
    pub fn float_above_panels(window: &WebviewWindow) {
        if !is_x11() {
            return;
        }
        let Ok(gtk_window) = window.gtk_window() else { return };
        gtk_window.realize();
        if let Some(gdk_window) = gtk_window.window() {
            gdk_window.set_override_redirect(true);
        }
    }

    /// Where an override-redirect window is, in physical pixels; `None` when not on X11.
    ///
    /// Tauri's `outer_position` comes from GDK's root origin, which for a window no window
    /// manager frames is in device pixels; Tauri scales it again, so on a 2x display every
    /// position read back doubled. `gdk_window_get_origin` asks the X server and scales correctly.
    /// Main thread only.
    pub fn position(window: &WebviewWindow) -> Option<PhysicalPosition<i32>> {
        if !is_x11() {
            return None;
        }
        let gtk_window = window.gtk_window().ok()?;
        let (_, x, y) = gtk_window.window()?.origin();
        let scale = gtk_window.scale_factor();
        Some(PhysicalPosition::new(x * scale, y * scale))
    }

    /// Move the window with the pointer, held at `grab` inside it (logical pixels), until the
    /// primary button is released, then save where it landed. Main thread only.
    pub fn drag(app: &AppHandle, window: WebviewWindow, grab: (i32, i32)) -> Result<(), String> {
        let gtk_window = window.gtk_window().map_err(|error| error.to_string())?;
        let display = gtk_window.display();
        let pointer = display
            .default_seat()
            .and_then(|seat| seat.pointer())
            .ok_or_else(|| "no pointer to drag the floating dock with".to_string())?;
        let root = GtkWindowExt::screen(&gtk_window)
            .ok_or_else(|| "no screen to drag the floating dock on".to_string())?
            .root_window()
            .ok_or_else(|| "no root window to drag the floating dock on".to_string())?;
        if app.state::<FloatingDockRuntime>().dragging.swap(true, Ordering::AcqRel) {
            return Ok(()); // Already following the pointer.
        }
        // In GDK's logical pixels, as `move_` takes them (see `position` for why not others).
        let mut last = gtk_window.window().map(|window| window.origin()).map(|(_, x, y)| (x, y));
        let app = app.clone();
        glib::timeout_add_local(DRAG_TICK, move || {
            let (_, x, y, buttons) = root.device_position(&pointer);
            if !buttons.contains(ModifierType::BUTTON1_MASK) {
                app.state::<FloatingDockRuntime>().dragging.store(false, Ordering::Release);
                if let Err(error) = super::save_position(&app, &window) {
                    tracing::warn!("Could not save the floating dock position: {error}");
                }
                return glib::ControlFlow::Break;
            }
            let next = (x - grab.0, y - grab.1);
            if Some(next) != last {
                gtk_window.move_(next.0, next.1);
                last = Some(next);
            }
            glib::ControlFlow::Continue
        });
        Ok(())
    }
}

/// A rectangle in physical pixels.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Rect {
    pub x: f64,
    pub y: f64,
    pub w: f64,
    pub h: f64,
}

impl Rect {
    fn right(&self) -> f64 {
        self.x + self.w
    }

    fn bottom(&self) -> f64 {
        self.y + self.h
    }

    fn contains(&self, x: f64, y: f64) -> bool {
        x >= self.x && x < self.right() && y >= self.y && y < self.bottom()
    }

    /// The same rectangle grown by `pad` on every side.
    pub fn inflate(&self, pad: f64) -> Rect {
        Rect { x: self.x - pad, y: self.y - pad, w: self.w + 2.0 * pad, h: self.h + 2.0 * pad }
    }
}

/// Where the menu goes beside the ball: below unless that leaves the work area, and extending to
/// the right unless that leaves it too.
pub fn menu_frame(ball: Rect, menu_w: f64, menu_h: f64, gap: f64, work: Rect) -> Rect {
    let below = ball.bottom() + gap + menu_h <= work.bottom();
    let right = ball.x + menu_w <= work.right();
    Rect {
        x: if right { ball.x } else { ball.right() - menu_w },
        y: if below { ball.bottom() + gap } else { ball.y - gap - menu_h },
        w: menu_w,
        h: menu_h,
    }
}

/// Move a window of `w`×`h` at (`x`, `y`) so it sits at least `edge` inside the work area.
pub fn clamp_to_work_area(x: f64, y: f64, w: f64, h: f64, edge: f64, work: Rect) -> (f64, f64) {
    let max_x = (work.right() - w - edge).max(work.x + edge);
    let max_y = (work.bottom() - h - edge).max(work.y + edge);
    (x.clamp(work.x + edge, max_x), y.clamp(work.y + edge, max_y))
}

/// The saved ball position when its centre is still on a monitor, otherwise the default: the right
/// edge of the primary work area, a third of the way down.
pub fn restore_position(saved: Option<(i32, i32)>, ball: f64, work_areas: &[Rect], primary: Rect, edge: f64) -> (f64, f64) {
    if let Some((x, y)) = saved {
        let (x, y) = (x as f64, y as f64);
        let centre = (x + ball / 2.0, y + ball / 2.0);
        if work_areas.iter().any(|work| work.contains(centre.0, centre.1)) {
            return (x, y);
        }
    }
    (primary.right() - ball - edge, primary.y + (primary.h - ball) / 3.0)
}

#[cfg(test)]
mod tests {
    use super::*;

    const WORK: Rect = Rect { x: 0.0, y: 0.0, w: 1920.0, h: 1040.0 };

    #[test]
    fn menu_opens_below_and_right_when_there_is_room() {
        let ball = Rect { x: 100.0, y: 100.0, w: 56.0, h: 56.0 };
        assert_eq!(menu_frame(ball, 248.0, 300.0, 8.0, WORK), Rect { x: 100.0, y: 164.0, w: 248.0, h: 300.0 });
    }

    #[test]
    fn menu_flips_up_and_left_in_the_bottom_right_corner() {
        let ball = Rect { x: 1850.0, y: 980.0, w: 56.0, h: 56.0 };
        assert_eq!(menu_frame(ball, 248.0, 300.0, 8.0, WORK), Rect { x: 1658.0, y: 672.0, w: 248.0, h: 300.0 });
    }

    #[test]
    fn menu_opens_below_and_left_in_the_top_right_corner() {
        let ball = Rect { x: 1850.0, y: 20.0, w: 56.0, h: 56.0 };
        assert_eq!(menu_frame(ball, 248.0, 300.0, 8.0, WORK), Rect { x: 1658.0, y: 84.0, w: 248.0, h: 300.0 });
    }

    #[test]
    fn menu_opens_above_and_right_in_the_bottom_left_corner() {
        let ball = Rect { x: 20.0, y: 980.0, w: 56.0, h: 56.0 };
        assert_eq!(menu_frame(ball, 248.0, 300.0, 8.0, WORK), Rect { x: 20.0, y: 672.0, w: 248.0, h: 300.0 });
    }

    #[test]
    fn padding_grows_the_frame_on_every_side() {
        let content = Rect { x: 100.0, y: 200.0, w: 56.0, h: 56.0 };
        assert_eq!(content.inflate(10.0), Rect { x: 90.0, y: 190.0, w: 76.0, h: 76.0 });
    }

    #[test]
    fn clamp_pulls_a_window_back_inside_the_work_area() {
        assert_eq!(clamp_to_work_area(1900.0, -20.0, 56.0, 56.0, 8.0, WORK), (1856.0, 8.0));
    }

    #[test]
    fn a_saved_position_off_every_monitor_falls_back_to_the_default() {
        let (x, y) = restore_position(Some((5000, 5000)), 56.0, &[WORK], WORK, 8.0);
        assert_eq!((x, y), (1856.0, (1040.0 - 56.0) / 3.0));
    }

    #[test]
    fn a_saved_position_on_a_monitor_is_kept() {
        assert_eq!(restore_position(Some((300, 400)), 56.0, &[WORK], WORK, 8.0), (300.0, 400.0));
    }
}
