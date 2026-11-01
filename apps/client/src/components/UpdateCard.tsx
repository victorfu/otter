import { useMutation } from "@tanstack/react-query";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  CircleCheck,
  Download,
  ExternalLink,
  LoaderCircle,
  RefreshCw,
  Rocket,
  TriangleAlert,
} from "lucide-react";
import { commands, type IpcError } from "@/lib/ipc";
import type { UpdateStatus } from "@/bindings/UpdateStatus";
import { Button, Card, ErrorText } from "./ui";

const DOCS_URL = "https://v2.tauri.app/";

export function ActionsCard() {
  const check = useMutation<UpdateStatus, IpcError>({ mutationFn: commands.checkUpdate });
  const install = useMutation<null, IpcError>({ mutationFn: commands.installUpdate });
  const open = useMutation({ mutationFn: (url: string) => openUrl(url) });

  return (
    <Card
      title="Actions"
      description="Plugins: opener & updater"
      icon={<Rocket className="size-4" />}
    >
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => open.mutate(DOCS_URL)}>
          <ExternalLink className="size-4" aria-hidden />
          Open Tauri docs
        </Button>
        <Button onClick={() => check.mutate()} disabled={check.isPending || install.isPending}>
          <RefreshCw className={check.isPending ? "size-4 animate-spin" : "size-4"} aria-hidden />
          Check for updates
        </Button>
      </div>

      <div className="mt-3 min-h-10 text-sm" aria-live="polite">
        {open.isError && <ErrorText>Could not open link: {String(open.error)}</ErrorText>}
        {check.isError && <ErrorText>Update check failed: {check.error.message}</ErrorText>}
        {check.isSuccess && <UpdateResult status={check.data} />}
        {check.data?.status === "available" && (
          <div className="mt-2">
            <Button variant="primary" onClick={() => install.mutate()} disabled={install.isPending}>
              {install.isPending ? (
                <LoaderCircle className="size-4 animate-spin" aria-hidden />
              ) : (
                <Download className="size-4" aria-hidden />
              )}
              Install and restart
            </Button>
            {install.isError && <ErrorText>{install.error.message}</ErrorText>}
          </div>
        )}
      </div>
    </Card>
  );
}

function UpdateResult({ status }: { status: UpdateStatus }) {
  switch (status.status) {
    case "notConfigured":
      return (
        <p className="flex items-start gap-2 text-amber-700 dark:text-amber-300">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            Updates are not set up yet.{" "}
            <span className="text-zinc-500 dark:text-zinc-400">{status.reason}</span>
          </span>
        </p>
      );
    case "upToDate":
      return (
        <p className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
          <CircleCheck className="size-4" aria-hidden />
          You're on the latest version (v{status.currentVersion}).
        </p>
      );
    case "available":
      return (
        <p className="text-brand-700 dark:text-brand-400">
          Version {status.version} is available (you have v{status.currentVersion}).
        </p>
      );
  }
}
