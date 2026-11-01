import { describe, expect, it } from "vitest";
import { isThemePreference, resolveTheme } from "./theme";

describe("resolveTheme", () => {
  it("uses explicit preferences as-is", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  it("follows the system for 'system'", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });
});

describe("isThemePreference", () => {
  it("accepts only known values", () => {
    expect(isThemePreference("system")).toBe(true);
    expect(isThemePreference("blue")).toBe(false);
    expect(isThemePreference(undefined)).toBe(false);
  });
});
