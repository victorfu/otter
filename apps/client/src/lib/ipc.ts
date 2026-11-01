import { invoke } from "@tauri-apps/api/core";
import type { AppInfo } from "@/bindings/AppInfo";
import type { AppPaths } from "@/bindings/AppPaths";
import type { CommandError } from "@/bindings/CommandError";
import type { Greeting } from "@/bindings/Greeting";
import type { SystemInfo } from "@/bindings/SystemInfo";
import type { UpdateStatus } from "@/bindings/UpdateStatus";

/** Error thrown by every command wrapper; mirrors Rust's `CommandError`. */
export class IpcError extends Error implements CommandError {
  readonly code: string;

  constructor({ code, message }: CommandError) {
    super(message);
    this.name = "IpcError";
    this.code = code;
  }
}

function isCommandError(value: unknown): value is CommandError {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as CommandError).code === "string" &&
    typeof (value as CommandError).message === "string"
  );
}

/** Normalize anything `invoke()` can reject with into an {@link IpcError}. */
export function toIpcError(err: unknown): IpcError {
  if (err instanceof IpcError) return err;
  if (isCommandError(err)) return new IpcError(err);
  if (err instanceof Error) return new IpcError({ code: "UNKNOWN", message: err.message });
  return new IpcError({ code: "UNKNOWN", message: String(err) });
}

async function call<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(command, args);
  } catch (err) {
    throw toIpcError(err);
  }
}

/** Typed wrappers for the Rust commands in crates-tauri/app/src. */
export const commands = {
  appInfo: () => call<AppInfo>("app_info"),
  appPaths: () => call<AppPaths>("app_paths"),
  systemInfo: () => call<SystemInfo>("system_info"),
  greet: (name: string) => call<Greeting>("greet", { name }),
  checkUpdate: () => call<UpdateStatus>("check_update"),
  installUpdate: () => call<null>("install_update"),
};
