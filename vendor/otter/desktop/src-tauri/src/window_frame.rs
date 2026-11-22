//! Extend the client area through the title bar. DWM still draws and hit-tests its real
//! caption buttons. Clip the child WebView HWND so it cannot intercept those buttons.
use windows::{
    core::{w, Result},
    Win32::{
        Foundation::{HWND, LPARAM, LRESULT, RECT, WPARAM},
        Graphics::{
            Dwm::*,
            Gdi::{CombineRgn, CreateRectRgn, DeleteObject, SetWindowRgn, RGN_DIFF},
        },
        UI::{
            Controls::MARGINS,
            HiDpi::{GetDpiForWindow, GetSystemMetricsForDpi},
            Shell::{DefSubclassProc, RemoveWindowSubclass, SetWindowSubclass},
            WindowsAndMessaging::*,
        },
    },
};

pub fn install(window: &tauri::WebviewWindow) -> Result<()> {
    let hwnd = HWND(window.hwnd().map_err(|_| windows::core::Error::from_thread())?.0);
    unsafe {
        let child = FindWindowExW(Some(hwnd), None, w!("WRY_WEBVIEW"), None)?;
        install_frame(hwnd, child)
    }
}

unsafe fn install_frame(hwnd: HWND, child: HWND) -> Result<()> {
    let margins = MARGINS {
        cyTopHeight: -1,
        cxLeftWidth: -1,
        cxRightWidth: -1,
        cyBottomHeight: -1,
    };
    DwmExtendFrameIntoClientArea(hwnd, &margins)?;
    SetWindowSubclass(hwnd, Some(frame_proc), 1, 0).ok()?;
    if !SetWindowSubclass(child, Some(child_proc), 1, hwnd.0 as usize).as_bool() {
        let _ = RemoveWindowSubclass(hwnd, Some(frame_proc), 1);
        return Err(windows::core::Error::from_thread());
    }
    SetWindowPos(
        hwnd,
        None,
        0,
        0,
        0,
        0,
        SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_NOACTIVATE | SWP_FRAMECHANGED,
    )?;
    clip_webview(child, hwnd);
    Ok(())
}

unsafe fn clip_webview(child: HWND, parent: HWND) {
    let mut rect = RECT::default();
    if GetClientRect(child, &mut rect).is_err() {
        return;
    }
    if GetWindowLongW(parent, GWL_STYLE) as u32 & WS_CAPTION.0 == 0 {
        SetWindowRgn(child, None, true);
        return;
    }
    let dpi = GetDpiForWindow(parent) as i32;
    let edge = if IsZoomed(parent).as_bool() {
        0
    } else {
        (5 * dpi / 96).max(1)
    };
    let region = CreateRectRgn(0, edge, rect.right, rect.bottom);
    let buttons = caption_info(parent);
    let mut child_bounds = RECT::default();
    let caption = if buttons.rgrect[5].right > buttons.rgrect[2].left && GetWindowRect(child, &mut child_bounds).is_ok() {
        CreateRectRgn(
            buttons.rgrect[2].left - child_bounds.left,
            buttons.rgrect[2].top - child_bounds.top,
            buttons.rgrect[5].right - child_bounds.left,
            buttons.rgrect[5].bottom - child_bounds.top,
        )
    } else {
        // Some DWM configurations defer button geometry until the first show.
        CreateRectRgn(rect.right - 140 * dpi / 96, 0, rect.right, 32 * dpi / 96)
    };
    CombineRgn(Some(region), Some(region), Some(caption), RGN_DIFF);
    let _ = DeleteObject(caption.into());
    if SetWindowRgn(child, Some(region), true) == 0 {
        let _ = DeleteObject(region.into());
    }
}

unsafe extern "system" fn child_proc(hwnd: HWND, msg: u32, wp: WPARAM, lp: LPARAM, id: usize, parent: usize) -> LRESULT {
    if msg == WM_NCDESTROY {
        let _ = RemoveWindowSubclass(hwnd, Some(child_proc), id);
    }
    let result = DefSubclassProc(hwnd, msg, wp, lp);
    if msg == WM_SIZE || msg == WM_DPICHANGED_AFTERPARENT {
        clip_webview(hwnd, HWND(parent as _));
    }
    result
}

unsafe fn caption_info(hwnd: HWND) -> TITLEBARINFOEX {
    let mut bar = TITLEBARINFOEX {
        cbSize: size_of::<TITLEBARINFOEX>() as u32,
        ..Default::default()
    };
    SendMessageW(hwnd, WM_GETTITLEBARINFOEX, None, Some(LPARAM(&mut bar as *mut _ as isize)));
    bar
}

unsafe extern "system" fn frame_proc(hwnd: HWND, msg: u32, wp: WPARAM, lp: LPARAM, id: usize, _: usize) -> LRESULT {
    if msg == WM_NCCALCSIZE && wp.0 != 0 {
        let params = lp.0 as *mut NCCALCSIZE_PARAMS;
        let top = (*params).rgrc[0].top;
        DefSubclassProc(hwnd, msg, wp, lp);
        let dpi = GetDpiForWindow(hwnd);
        let inset = if IsZoomed(hwnd).as_bool() {
            GetSystemMetricsForDpi(SM_CYSIZEFRAME, dpi) + GetSystemMetricsForDpi(SM_CXPADDEDBORDER, dpi)
        } else {
            0
        };
        (*params).rgrc[0].top = top + inset;
        return LRESULT(0);
    }
    let mut hit = LRESULT::default();
    if DwmDefWindowProc(hwnd, msg, wp, lp, &mut hit).as_bool() {
        return hit;
    }
    if msg == WM_NCHITTEST {
        // DWM can decline a hit on an inactive window. Consult the OS button rectangles
        // (in screen coordinates) so hovering Maximize still opens the Snap flyout.
        let x = lp.0 as i16 as i32;
        let y = (lp.0 >> 16) as i16 as i32;
        let bar = caption_info(hwnd);
        for (index, hit) in [(2, HTMINBUTTON), (3, HTMAXBUTTON), (5, HTCLOSE)] {
            let r = bar.rgrect[index];
            if x >= r.left && x < r.right && y >= r.top && y < r.bottom {
                return LRESULT(hit as isize);
            }
        }
        let mut bounds = RECT::default();
        if !IsZoomed(hwnd).as_bool()
            && GetWindowRect(hwnd, &mut bounds).is_ok()
            && y < bounds.top + (5 * GetDpiForWindow(hwnd) as i32 / 96).max(1)
        {
            return LRESULT(HTTOP as isize);
        }
    }
    if msg == WM_NCDESTROY {
        let _ = RemoveWindowSubclass(hwnd, Some(frame_proc), id);
    }
    DefSubclassProc(hwnd, msg, wp, lp)
}

#[cfg(test)]
mod tests {
    use super::*;
    use windows::Win32::Graphics::Gdi::{GetWindowRgn, PtInRegion};

    #[test]
    fn webview_leaves_native_maximize_hit_target_available() {
        unsafe {
            let hwnd = CreateWindowExW(
                Default::default(),
                w!("STATIC"),
                w!("Otter frame test"),
                WS_OVERLAPPEDWINDOW,
                30,
                30,
                800,
                500,
                None,
                None,
                None,
                None,
            )
            .unwrap();
            let child = CreateWindowExW(
                Default::default(),
                w!("STATIC"),
                None,
                WS_CHILD,
                0,
                0,
                780,
                480,
                Some(hwnd),
                None,
                None,
                None,
            )
            .unwrap();
            install_frame(hwnd, child).unwrap();
            let region = CreateRectRgn(0, 0, 0, 0);
            GetWindowRgn(child, region);
            let covers_body = PtInRegion(region, 100, 100).as_bool();
            let covers_caption = PtInRegion(region, 760, 16).as_bool();
            let _ = DeleteObject(region.into());
            let mut bar = TITLEBARINFOEX {
                cbSize: size_of::<TITLEBARINFOEX>() as u32,
                ..Default::default()
            };
            SendMessageW(hwnd, WM_GETTITLEBARINFOEX, None, Some(LPARAM(&mut bar as *mut _ as isize)));
            let rect = bar.rgrect[3];
            let x = (rect.left + rect.right) / 2;
            let y = (rect.top + rect.bottom) / 2;
            let hit = SendMessageW(hwnd, WM_NCHITTEST, None, Some(LPARAM(((y << 16) | (x & 65535)) as isize)));
            DestroyWindow(hwnd).unwrap();
            assert!(covers_body && !covers_caption);
            assert!(rect.right > rect.left);
            assert_eq!(hit.0, HTMAXBUTTON as isize);
        }
    }
}
