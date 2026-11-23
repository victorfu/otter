#!/usr/bin/env node
// The desktop title bar, native bundles and web assets share one raster master.
import { copyFileSync } from "node:fs";
import path from "node:path";
import { ROOT, run } from "./lib/util.mjs";

const app = ROOT;
const master = path.join(app, "design", "logo.png");
const native = path.join(app, "desktop", "src-tauri", "icons");
run("tauri", ["icon", master, "--output", native]);

copyFileSync(path.join(native, "128x128.png"), path.join(app, "desktop", "public", "logo.png"));
copyFileSync(path.join(native, "128x128.png"), path.join(app, "design", "taskbar.png"));
copyFileSync(master, path.join(app, "website", "public", "logo.png"));
const python = process.platform === "win32" ? "python" : "python3";
run(python, ["scripts/windows-icons.py"]);
run(python, ["scripts/linux-icons.py"]);
