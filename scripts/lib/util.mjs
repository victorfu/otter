// Shared helpers for the cross-platform Node scripts in this folder.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const TAURI_DIR = path.join(ROOT, "crates-tauri", "app");
export const CLIENT_DIR = path.join(ROOT, "apps", "client");
export const isWindows = process.platform === "win32";

/** Human-readable platform folder name used under release/<version>/. */
export const platformName = { win32: "windows", darwin: "macos", linux: "linux" }[process.platform];

const color = (code) => (s) => (process.stdout.isTTY ? `\x1b[${code}m${s}\x1b[0m` : s);
export const c = {
  red: color(31),
  green: color(32),
  yellow: color(33),
  cyan: color(36),
  dim: color(2),
  bold: color(1),
};

const quote = (a) => (/[\s"&|<>^()]/.test(a) ? `"${a.replaceAll('"', '\\"')}"` : a);

/**
 * Run a command synchronously. Uses a shell on Windows so `.cmd` shims
 * (npm, npx, node_modules/.bin/*) resolve the same way they do in a terminal.
 */
export function run(cmd, args = [], opts = {}) {
  const { capture = false, cwd = ROOT, env, allowFail = false } = opts;
  const result = spawnSync(
    isWindows ? [cmd, ...args].map(quote).join(" ") : cmd,
    isWindows ? [] : args,
    {
      cwd,
      env: env ? { ...process.env, ...env } : process.env,
      stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
      encoding: "utf8",
      shell: isWindows,
    },
  );
  if (result.error && !allowFail) throw result.error;
  if (result.status !== 0 && !allowFail) {
    const err = new Error(`Command failed (${result.status}): ${cmd} ${args.join(" ")}`);
    err.status = result.status;
    err.stderr = result.stderr;
    throw err;
  }
  return {
    ok: !result.error && result.status === 0,
    status: result.status,
    stdout: (result.stdout ?? "").trim(),
    stderr: (result.stderr ?? "").trim(),
  };
}

/** Run a command and return trimmed stdout, or null if it fails / is missing. */
export function tryOutput(cmd, args = [], opts = {}) {
  try {
    const r = run(cmd, args, { ...opts, capture: true, allowFail: true });
    return r.ok ? r.stdout || r.stderr : null;
  } catch {
    return null;
  }
}

export const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
export const writeJson = (file, data) => writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);

export const rootPackage = () => readJson(path.join(ROOT, "package.json"));
export const appConfig = () => readJson(path.join(ROOT, "app.json"));

/** Load ROOT/.env into process.env if present (does not override existing vars). */
export function loadDotEnv() {
  const file = path.join(ROOT, ".env");
  if (existsSync(file)) process.loadEnvFile(file);
}

export const SEMVER =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/;
