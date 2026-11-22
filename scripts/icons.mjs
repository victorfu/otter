#!/usr/bin/env node
// The desktop title bar, native bundles and web assets share one raster master.
import { copyFileSync, mkdirSync, readdirSync } from "node:fs";
import path from "node:path";
import { CLIENT_DIR, ROOT, TAURI_DIR, run } from "./lib/util.mjs";

const app = path.join(ROOT, "vendor", "otter");
const master = path.join(app, "design", "logo.png");
const native = path.join(app, "desktop", "src-tauri", "icons");
run("tauri", ["icon", master, "--output", native]);

for (const flavor of ["release", "dev"]) {
  const target = path.join(TAURI_DIR, "icons", flavor);
  mkdirSync(target, { recursive: true });
  copyFileSync(master, path.join(TAURI_DIR, "icons", "source", flavor + ".png"));
  for (const entry of readdirSync(native, { withFileTypes: true })) {
    if (entry.isFile() && /\.(png|ico|icns)$/.test(entry.name)) {
      copyFileSync(path.join(native, entry.name), path.join(target, entry.name));
    }
  }
}

copyFileSync(path.join(native, "32x32.png"), path.join(CLIENT_DIR, "public", "favicon.png"));
copyFileSync(path.join(native, "128x128.png"), path.join(app, "desktop", "public", "logo.png"));
copyFileSync(path.join(native, "128x128.png"), path.join(app, "design", "taskbar.png"));
copyFileSync(master, path.join(app, "website", "public", "logo.png"));
run(process.platform === "win32" ? "python" : "python3", ["scripts/windows-icons.py"]);
