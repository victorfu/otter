#!/usr/bin/env node
// First-time setup after `npm install` (run via `npm run init`).
import { copyFileSync, existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { ROOT, c, run } from "./lib/util.mjs";

const toolchain = readFileSync(path.join(ROOT, "rust-toolchain.toml"), "utf8").match(
  /channel\s*=\s*"([^"]+)"/,
)?.[1];

console.log(c.cyan(`\n▶ Installing Rust ${toolchain} (from rust-toolchain.toml)`));
run("rustup", [
  "toolchain",
  "install",
  "--no-self-update",
  toolchain,
  "--profile",
  "minimal",
  "--component",
  "rustfmt",
  "--component",
  "clippy",
]);

if (process.platform === "darwin") {
  console.log(c.cyan("\n▶ Adding macOS targets for universal builds"));
  run("rustup", [
    "target",
    "add",
    "aarch64-apple-darwin",
    "x86_64-apple-darwin",
    "--toolchain",
    toolchain,
  ]);
}

console.log(c.cyan("\n▶ Fetching Rust crates"));
run("cargo", ["fetch", "--locked"]);

const env = path.join(ROOT, ".env");
if (!existsSync(env)) {
  copyFileSync(path.join(ROOT, ".env.example"), env);
  console.log(
    c.green("\nCreated .env from .env.example (fill it in before signed release builds)."),
  );
}

console.log(c.green("\n✔ Ready. Next: `npm run doctor`, then `npm start`.\n"));
