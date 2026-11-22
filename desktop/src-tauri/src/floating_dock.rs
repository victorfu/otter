//! The floating dock: a small always-on-top button on the desktop. It only sends actions to the
//! main window; recording, dictation and transcription still run there.

use crate::config::STORE_FILENAME;
use serde::Serialize;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, Monitor, PhysicalPosition, PhysicalSize, WebviewUrl, WebviewWindow, WebviewWindowBuilder};
use tauri_plugin_store::StoreExt;

const WINDOW_LABEL: &str = "floating-dock";
/// Config keys, shared with the frontend.
const ENABLED_KEY: &str = "floatingDock.enabled";
const POSITION_KEY: &str = "floatingDock.position";
pub const ENABLED_EVENT: &str = "floating-dock-enabled";
/// Logical pixels.
const BALL: f64 = 56.0;
const MENU_WIDTH: f64 = 248.0;
const GAP: f64 = 8.0;
const EDGE: f64 = 8.0;
/// Transparent margin around the ball and menu so their shadows are not clipped into a square.
/// Must match `PAD` in `floating-dock-window.tsx`.
const PAD: f64 = 12.0;
/// The collapsed window: the ball plus its margin.
const SLOT: f64 = BALL + 2.0 * PAD;

/// While the menu is open the window is larger than the ball; this remembers where the ball was
/// so collapsing puts it back exactly, and so a position is never saved from the open frame.
#[derive(Default)]
pub struct FloatingDockRuntime {
    ball_origin: Mutex<Option<(i32, i32)>>,
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
fn monitor_at(window: &WebviewWindow, x: f64, y: f64) -> Result<Monitor, String> {
    window
        .monitor_from_point(x, y)
        .ok()
        .flatten()
        .or_else(|| window.current_monitor().ok().flatten())
        .or_else(|| window.primary_monitor().ok().flatten())
        .ok_or_else(|| "no monitor to place the floating dock on".to_string())
}

fn create_window(app: &AppHandle) -> Result<WebviewWindow, String> {
    let window = WebviewWindowBuilder::new(app, WINDOW_LABEL, WebviewUrl::App("index.html?window=floating-dock".into()))
        .inner_size(SLOT, SLOT)
        .decorations(false)
        .resizable(false)
        .always_on_top(true)
        .visible_on_all_workspaces(true)
        .focused(false)
        // Clicking the dock must leave the app the user is typing in focused, or dictation would
        // type into the wrong place.
        .focusable(false)
        .accept_first_mouse(true)
        .skip_taskbar(true)
        .transparent(true)
        .shadow(false)
        .visible(false)
        .on_navigation(crate::setup::navigation_guard(app))
        .build()
        .map_err(|error| error.to_string())?;

    #[cfg(target_os = "macos")]
    unsafe {
        use objc2_app_kit::{NSStatusWindowLevel, NSWindow, NSWindowCollectionBehavior};

        let native_window: &NSWindow = &*window.ns_window().map_err(|error| error.to_string())?.cast();
        native_window.setCollectionBehavior(
            native_window.collectionBehavior()
                | NSWindowCollectionBehavior::CanJoinAllSpaces
                | NSWindowCollectionBehavior::FullScreenAuxiliary,
        );
        native_window.setLevel(NSStatusWindowLevel);
        native_window.setOpaque(false);
    }

    let primary = window
        .primary_monitor()
        .ok()
        .flatten()
        .or_else(|| window.current_monitor().ok().flatten())
        .ok_or_else(|| "no monitor to place the floating dock on".to_string())?;
    let work_areas: Vec<Rect> = window
        .available_monitors()
        .map_err(|error| error.to_string())?
        .iter()
        .map(work_area)
        .collect();
    let scale = primary.scale_factor();
    let (x, y) = restore_position(saved_position(app), SLOT * scale, &work_areas, work_area(&primary), (EDGE - PAD) * scale);
    window
        .set_position(PhysicalPosition::new(x.round() as i32, y.round() as i32))
        .map_err(|error| error.to_string())?;
    window.show().map_err(|error| error.to_string())?;
    Ok(window)
}

pub fn initialize(app: &AppHandle) {
    if is_enabled(app) && app.get_webview_window(WINDOW_LABEL).is_none() {
        if let Err(error) = create_window(app) {
            tracing::error!("Could not create the floating dock: {error}");
        }
    }
}

/// Turn the dock on or off from anywhere (settings, tray, the dock's own menu).
pub fn set_enabled(app: &AppHandle, enabled: bool) -> Result<(), String> {
    let store = app.store(STORE_FILENAME).map_err(|error| error.to_string())?;
    store.set(ENABLED_KEY, serde_json::Value::Bool(enabled));
    store.save().map_err(|error| error.to_string())?;
    let existing = app.get_webview_window(WINDOW_LABEL);
    if enabled {
        if existing.is_none() {
            create_window(app)?;
        }
    } else {
        if let Ok(mut origin) = app.state::<FloatingDockRuntime>().ball_origin.lock() {
            *origin = None;
        }
        if let Some(window) = existing {
            window.close().map_err(|error| error.to_string())?;
        }
    }
    crate::tray::sync_floating_dock(app, enabled);
    app.emit(ENABLED_EVENT, enabled).map_err(|error| error.to_string())
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

/// Grow the window to hold the open menu (`menu_height` in logical pixels), or shrink it back to
/// the ball.
#[tauri::command]
pub fn set_floating_dock_expanded(
    window: WebviewWindow,
    runtime: tauri::State<'_, FloatingDockRuntime>,
    expanded: bool,
    menu_height: f64,
) -> Result<Placement, String> {
    let mut origin = runtime.ball_origin.lock().map_err(|error| error.to_string())?;
    if !expanded {
        if let Some((x, y)) = origin.take() {
            let scale = window.scale_factor().map_err(|error| error.to_string())?;
            let ball = (SLOT * scale).round() as u32;
            window
                .set_size(PhysicalSize::new(ball, ball))
                .map_err(|error| error.to_string())?;
            window
                .set_position(PhysicalPosition::new(x, y))
                .map_err(|error| error.to_string())?;
        }
        return Ok(Placement { menu_below: true, align_right: false });
    }

    let (x, y) = match *origin {
        Some(position) => position,
        None => {
            let position = window.outer_position().map_err(|error| error.to_string())?;
            (position.x, position.y)
        }
    };
    *origin = Some((x, y));
    let probe = window.scale_factor().map_err(|error| error.to_string())?;
    let monitor = monitor_at(&window, x as f64 + SLOT * probe / 2.0, y as f64 + SLOT * probe / 2.0)?;
    let scale = monitor.scale_factor();
    let ball = Rect { x: x as f64 + PAD * scale, y: y as f64 + PAD * scale, w: BALL * scale, h: BALL * scale };
    let (content, placement) = expanded_frame(ball, MENU_WIDTH * scale, menu_height * scale, GAP * scale, work_area(&monitor));
    let frame = content.inflate(PAD * scale);
    window
        .set_size(PhysicalSize::new(frame.w.round() as u32, frame.h.round() as u32))
        .map_err(|error| error.to_string())?;
    window
        .set_position(PhysicalPosition::new(frame.x.round() as i32, frame.y.round() as i32))
        .map_err(|error| error.to_string())?;
    Ok(placement)
}

/// Remember where the user dragged the ball. Ignored while the menu is open.
#[tauri::command]
pub fn save_floating_dock_position(
    app: AppHandle,
    window: WebviewWindow,
    runtime: tauri::State<'_, FloatingDockRuntime>,
) -> Result<(), String> {
    if runtime.ball_origin.lock().map_err(|error| error.to_string())?.is_some() {
        return Ok(());
    }
    let position = window.outer_position().map_err(|error| error.to_string())?;
    let scale = window.scale_factor().map_err(|error| error.to_string())?;
    let size = SLOT * scale;
    let monitor = monitor_at(&window, position.x as f64 + size / 2.0, position.y as f64 + size / 2.0)?;
    let (x, y) = clamp_to_work_area(position.x as f64, position.y as f64, size, size, (EDGE - PAD) * scale, work_area(&monitor));
    let (x, y) = (x.round() as i32, y.round() as i32);
    if (x, y) != (position.x, position.y) {
        window
            .set_position(PhysicalPosition::new(x, y))
            .map_err(|error| error.to_string())?;
    }
    let store = app.store(STORE_FILENAME).map_err(|error| error.to_string())?;
    store.set(POSITION_KEY, serde_json::json!({ "x": x, "y": y }));
    store.save().map_err(|error| error.to_string())
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

/// Where the menu opens relative to the ball, so the window can lay itself out.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Placement {
    pub menu_below: bool,
    pub align_right: bool,
}

/// The window frame that holds the ball and its open menu. The menu opens below the ball unless it
/// would leave the work area, and extends to the right unless that would leave it too.
pub fn expanded_frame(ball: Rect, menu_w: f64, menu_h: f64, gap: f64, work: Rect) -> (Rect, Placement) {
    let placement = Placement {
        menu_below: ball.bottom() + gap + menu_h <= work.bottom(),
        align_right: ball.x + menu_w > work.right(),
    };
    let menu_x = if placement.align_right { ball.right() - menu_w } else { ball.x };
    let menu_y = if placement.menu_below { ball.bottom() + gap } else { ball.y - gap - menu_h };
    let x = ball.x.min(menu_x);
    let y = ball.y.min(menu_y);
    let right = ball.right().max(menu_x + menu_w);
    let bottom = ball.bottom().max(menu_y + menu_h);
    (Rect { x, y, w: right - x, h: bottom - y }, placement)
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
        let (frame, placement) = expanded_frame(ball, 248.0, 300.0, 8.0, WORK);
        assert_eq!(placement, Placement { menu_below: true, align_right: false });
        assert_eq!(frame, Rect { x: 100.0, y: 100.0, w: 248.0, h: 364.0 });
    }

    #[test]
    fn menu_flips_up_and_left_in_the_bottom_right_corner() {
        let ball = Rect { x: 1850.0, y: 980.0, w: 56.0, h: 56.0 };
        let (frame, placement) = expanded_frame(ball, 248.0, 300.0, 8.0, WORK);
        assert_eq!(placement, Placement { menu_below: false, align_right: true });
        assert_eq!(frame, Rect { x: 1658.0, y: 672.0, w: 248.0, h: 364.0 });
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
