import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useAtomValue } from "jotai";
import { useEffect, useSyncExternalStore } from "react";
import { resolveTheme, themePreferenceAtom } from "@/lib/theme";

const darkQuery = () => window.matchMedia("(prefers-color-scheme: dark)");

function subscribe(onChange: () => void) {
  const mq = darkQuery();
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

export function useSystemPrefersDark() {
  return useSyncExternalStore(subscribe, () => darkQuery().matches);
}

/** Applies the theme preference to <html> and the native window chrome. */
export function ThemeSync() {
  const preference = useAtomValue(themePreferenceAtom);
  const resolved = resolveTheme(preference, useSystemPrefersDark());

  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolved === "dark");
  }, [resolved]);

  useEffect(() => {
    if (!isTauri()) return;
    // `null` lets the native title bar follow the OS again.
    getCurrentWindow()
      .setTheme(preference === "system" ? null : preference)
      .catch((err: unknown) => console.warn("setTheme failed", err));
  }, [preference]);

  return null;
}
