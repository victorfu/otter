import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useAtomValue } from "jotai";
import { useCallback, useEffect, useRef, useState } from "react";
import { type ThemePreference, resolveTheme, themePreferenceAtom } from "@/lib/theme";

const darkQuery = () => window.matchMedia("(prefers-color-scheme: dark)");

// `setTheme` is async IPC. Run calls one at a time so a stale call can never
// finish last and leave the native window on the wrong theme.
let nativeThemeQueue: Promise<void> = Promise.resolve();
function applyNativeTheme(pref: ThemePreference): Promise<void> {
  nativeThemeQueue = nativeThemeQueue
    .then(() => getCurrentWindow().setTheme(pref === "system" ? null : pref))
    .catch((err: unknown) => console.warn("setTheme failed", err));
  return nativeThemeQueue;
}

/** Applies the theme preference to <html> and the native window chrome. */
export function ThemeSync() {
  const preference = useAtomValue(themePreferenceAtom);
  const [systemDark, setSystemDark] = useState(() => darkQuery().matches);
  const latestRead = useRef(0);

  // Re-read the effective OS theme. Forcing a native theme also changes the
  // webview's prefers-color-scheme, and its change events can be dropped, so
  // we re-read on every signal; only the most recent read is applied.
  const refresh = useCallback(async () => {
    const read = ++latestRead.current;
    let dark = darkQuery().matches;
    if (isTauri()) {
      try {
        const native = await getCurrentWindow().theme();
        if (native) dark = native === "dark";
      } catch (err) {
        console.warn("theme() failed", err);
      }
    }
    if (read === latestRead.current) setSystemDark(dark);
  }, []);

  useEffect(() => {
    const mq = darkQuery();
    const onChange = () => void refresh();
    mq.addEventListener("change", onChange);
    let unlisten: (() => void) | undefined;
    let disposed = false;
    if (isTauri()) {
      void getCurrentWindow()
        .onThemeChanged(onChange)
        .then((fn) => (disposed ? fn() : (unlisten = fn)));
    }
    return () => {
      disposed = true;
      mq.removeEventListener("change", onChange);
      unlisten?.();
    };
  }, [refresh]);

  useEffect(() => {
    if (!isTauri()) return;
    // `null` lets the native title bar follow the OS again; then re-read it.
    void applyNativeTheme(preference).then(refresh);
  }, [preference, refresh]);

  const resolved = resolveTheme(preference, systemDark);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolved === "dark");
  }, [resolved]);

  return null;
}
