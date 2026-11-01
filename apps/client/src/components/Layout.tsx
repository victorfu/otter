import { useQuery } from "@tanstack/react-query";
import { Link, Outlet } from "@tanstack/react-router";
import { House, Info } from "lucide-react";
import { appInfoQuery } from "@/lib/queries";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { Badge } from "./ui";

const NAV = [
  { to: "/", label: "Home", icon: House },
  { to: "/about", label: "About", icon: Info },
] as const;

export function Layout() {
  const { data: app } = useQuery(appInfoQuery);

  return (
    <div className="flex h-full">
      <aside className="flex w-60 shrink-0 flex-col border-r border-zinc-200 bg-zinc-100/70 dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="flex items-center gap-3 px-5 pt-6 pb-5">
          <AppMark />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{app?.name ?? "…"}</div>
            {app && <div className="text-xs text-zinc-500 dark:text-zinc-400">v{app.version}</div>}
          </div>
        </div>

        <nav className="flex flex-col gap-0.5 px-3" aria-label="Main">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: true }}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-200/70 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              activeProps={{
                className: "bg-white! text-zinc-900! shadow-xs dark:bg-zinc-800! dark:text-white!",
              }}
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto space-y-3 p-4">
          {app && (
            <div className="flex justify-center">
              <Badge tone={app.buildType === "dev" ? "amber" : "emerald"}>
                {app.buildType === "dev" ? "Development build" : "Release build"}
              </Badge>
            </div>
          )}
          <ThemeSwitcher />
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function AppMark() {
  return (
    <div className="flex size-9 items-center justify-center rounded-xl bg-linear-to-br from-brand-500 to-violet-600 shadow-sm">
      <svg viewBox="0 0 24 24" className="size-5 text-white" aria-hidden>
        <circle cx="11" cy="13" r="5.5" fill="none" stroke="currentColor" strokeWidth="2.6" />
        <circle cx="17" cy="6.5" r="2.2" fill="currentColor" />
      </svg>
    </div>
  );
}
