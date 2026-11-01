import { useQuery } from "@tanstack/react-query";
import { FolderOpen, Layers, Package } from "lucide-react";
import { appInfoQuery, appPathsQuery } from "@/lib/queries";
import { Card, ErrorText, InfoList, Skeleton } from "@/components/ui";

const STACK = [
  ["Desktop", "Tauri 2"],
  ["UI", "React · TypeScript · Vite"],
  ["Styling", "Tailwind CSS 4 · lucide-react"],
  ["Routing & data", "TanStack Router · TanStack Query"],
  ["State", "Jotai"],
  ["Shared types", "ts-rs (Rust → TypeScript)"],
] as const;

export function AboutPage() {
  const app = useQuery(appInfoQuery);
  const paths = useQuery(appPathsQuery);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">About</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Build details and where this build keeps its data.
        </p>
      </header>

      <div className="grid gap-5 md:grid-cols-2">
        <Card title="Application" icon={<Package className="size-4" />}>
          {app.data ? (
            <InfoList
              items={[
                ["Name", app.data.name],
                ["Version", app.data.version],
                ["Build", app.data.buildType],
                ["Identifier", app.data.identifier],
                ["Tauri", app.data.tauriVersion],
              ]}
            />
          ) : app.error ? (
            <ErrorText>{app.error.message}</ErrorText>
          ) : (
            <Skeleton className="h-24" />
          )}
        </Card>

        <Card title="Tech stack" icon={<Layers className="size-4" />}>
          <InfoList items={STACK} />
        </Card>

        <Card
          title="Data directories"
          description="Dev and release builds use different identifiers, so they never share data."
          icon={<FolderOpen className="size-4" />}
          className="md:col-span-2"
        >
          {paths.data ? (
            <InfoList
              items={[
                ["Data", <PathText key="data" path={paths.data.dataDir} />],
                ["Config", <PathText key="config" path={paths.data.configDir} />],
                ["Logs", <PathText key="logs" path={paths.data.logDir} />],
              ]}
            />
          ) : paths.error ? (
            <ErrorText>{paths.error.message}</ErrorText>
          ) : (
            <Skeleton className="h-16" />
          )}
        </Card>
      </div>
    </div>
  );
}

function PathText({ path }: { path: string }) {
  return (
    <code className="font-mono text-xs" title={path}>
      {path}
    </code>
  );
}
