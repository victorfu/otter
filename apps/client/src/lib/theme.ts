import { atomWithStorage } from "jotai/utils";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

/** Must match the key read by the inline script in index.html. */
export const THEME_STORAGE_KEY = "otter.theme";

/** Persisted in localStorage, which is per app identifier (dev and release are separate). */
export const themePreferenceAtom = atomWithStorage<ThemePreference>(
  THEME_STORAGE_KEY,
  "system",
  undefined,
  { getOnInit: true },
);

export function resolveTheme(pref: ThemePreference, systemPrefersDark: boolean): ResolvedTheme {
  if (pref === "system") return systemPrefersDark ? "dark" : "light";
  return pref;
}

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}
