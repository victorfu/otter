#!/usr/bin/env node
// Propagate app.json (identity) and package.json (version) to every file that
// needs them. Single sources of truth:
//   - app.json      → product name, identifier, updater endpoint
//   - package.json  → version
//
//   npm run sync              # write changes
//   npm run sync -- --check   # exit 1 if anything is out of sync
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import {
  ROOT,
  appConfig,
  c,
  readJson,
  rootPackage,
  run,
} from "./lib/util.mjs";

const check = process.argv.includes("--check");
const app = appConfig();
const version = rootPackage().version;
const drift = [];
const written = [];

/** Apply `mutate` to a JSON file; record drift (check) or write (fix). */
function syncJson(rel, mutate) {
  const file = path.join(ROOT, rel);
  const before = readJson(file);
  const after = structuredClone(before);
  mutate(after);
  if (isDeepStrictEqual(before, after)) return;
  if (check) drift.push(rel);
  else {
    writeFileSync(file, `${JSON.stringify(after, null, 2)}\n`);
    written.push(rel);
  }
}

/** Regex-replace inside a text file. */
function syncText(rel, replacer) {
  const file = path.join(ROOT, rel);
  if (!existsSync(file)) return;
  const before = readFileSync(file, "utf8");
  const after = replacer(before);
  if (before === after) return;
  if (check) drift.push(rel);
  else {
    writeFileSync(file, after);
    written.push(rel);
  }
}

// --- Tauri configs ------------------------------------------------------------
syncJson("desktop/src-tauri/tauri.conf.json", (conf) => {
  conf.productName = app.productName;
  conf.identifier = app.identifier;
  conf.version = version;
  conf.plugins.updater.endpoints = [app.updaterEndpoint];
});
syncJson("desktop/package.json", (pkg) => { pkg.version = version; });
syncJson("package-lock.json", (lock) => {
  lock.version = version;
  lock.packages[""].version = version;
});
syncText("desktop/src-tauri/Cargo.toml", (s) => s.replace(/^(version = ")[^"]+"/m, `$1${version}"`));
syncText("Cargo.lock", (s) => s.replace(/(name = "otter"\r?\nversion = ")[^"]+"/, `$1${version}"`));
syncText("desktop/index.html", (s) => s.replace(/<title>[^<]*<\/title>/, `<title>${app.productName}</title>`));

// --- Report -------------------------------------------------------------------
if (check) {
  if (drift.length) {
    console.error(c.red("Out of sync with app.json / package.json version:"));
    for (const f of drift) console.error(`  ${f}`);
    console.error(c.cyan("Run `npm run sync` and commit the result."));
    process.exit(1);
  }
  console.log(c.green(`In sync: ${app.productName} (${app.identifier}) v${version}`));
} else if (written.length) {
  // Keep JSON formatting consistent with the repo's formatter.
  const json = written.filter((f) => f.endsWith(".json") && f !== "package-lock.json");
  if (json.length) run("oxfmt", json);
  for (const f of written) console.log(c.green(`updated ${f}`));
} else {
  console.log("Everything already in sync.");
}
