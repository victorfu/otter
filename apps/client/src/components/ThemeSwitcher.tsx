import { useAtom } from "jotai";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/cn";
import { type ThemePreference, isThemePreference, themePreferenceAtom } from "@/lib/theme";

const OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

/** Segmented control built from native radio inputs (keyboard + a11y for free). */
export function ThemeSwitcher() {
  const [preference, setPreference] = useAtom(themePreferenceAtom);

  return (
    <fieldset className="grid grid-cols-3 gap-1 rounded-lg bg-zinc-200/60 p-1 dark:bg-zinc-800/80">
      <legend className="sr-only">Theme</legend>
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <label
          key={value}
          title={label}
          className={cn(
            "flex cursor-pointer items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition has-focus-visible:outline-2 has-focus-visible:outline-brand-500",
            preference === value
              ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white"
              : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200",
          )}
        >
          <input
            type="radio"
            name="theme"
            value={value}
            checked={preference === value}
            onChange={(e) => {
              if (isThemePreference(e.target.value)) setPreference(e.target.value);
            }}
            className="sr-only"
          />
          <Icon className="size-3.5 shrink-0" aria-hidden />
          <span>{label}</span>
        </label>
      ))}
    </fieldset>
  );
}
