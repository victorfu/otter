import { useQuery } from "@tanstack/react-query";
import { appInfoQuery } from "@/lib/queries";
import { GreetCard } from "@/components/GreetCard";
import { SystemCard } from "@/components/SystemCard";
import { ActionsCard } from "@/components/UpdateCard";
import { Badge, Skeleton } from "@/components/ui";

export function HomePage() {
  const { data: app, error } = useQuery(appInfoQuery);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-semibold tracking-wider text-brand-600 uppercase dark:text-brand-400">
          Welcome
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          {app ? app.name : <Skeleton className="h-9 w-48" />}
        </h1>
        <p className="mt-2 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
          A starter wired end to end: React UI, typed Tauri commands, and pure Rust logic in the
          core crate.
        </p>
        {error && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">
            Could not reach the Tauri backend: {error.message}
          </p>
        )}
        {app && (
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge tone="brand">v{app.version}</Badge>
            <Badge tone={app.buildType === "dev" ? "amber" : "emerald"}>{app.buildType}</Badge>
            <Badge>Tauri {app.tauriVersion}</Badge>
          </div>
        )}
      </header>

      <div className="grid gap-5 md:grid-cols-2">
        <SystemCard />
        <GreetCard />
        <ActionsCard />
      </div>
    </div>
  );
}
