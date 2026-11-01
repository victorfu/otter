#!/usr/bin/env node
// Propagate app.json (identity) and package.json (version) to every file that
// needs them. Single sources of truth:
//   - app.json      → product name, identifier, publisher, updater endpoint …
//   - package.json  → version
//
//   npm run sync              # write changes
//   npm run sync -- --check   # exit 1 if anything is out of sync
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import {
  CLIENT_DIR,
  ROOT,
  TAURI_DIR,
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

const rel = (p) => path.relative(ROOT, p).replaceAll("\\", "/");

// --- Tauri configs ------------------------------------------------------------
syncJson(rel(path.join(TAURI_DIR, "tauri.conf.json")), (conf) => {
  conf.productName = `${app.productName} Dev`;
  conf.identifier = `${app.identifier}.dev`;
  conf.version = version;
  conf.app.windows[0].title = `${app.productName} Dev`;
  Object.assign(conf.bundle, {
    publisher: app.publisher,
    homepage: app.homepage,
    copyright: `© ${app.publisher}`,
    shortDescription: app.description,
    longDescription: app.description,
  });
});

syncJson(rel(path.join(TAURI_DIR, "tauri.release.conf.json")), (conf) => {
  conf.productName = app.productName;
  conf.identifier = app.identifier;
  conf.plugins.updater.endpoints = [app.updaterEndpoint];
});

// --- Versions -----------------------------------------------------------------
syncJson(rel(path.join(CLIENT_DIR, "package.json")), (pkg) => {
  pkg.version = version;
});

syncJson("package-lock.json", (lock) => {
  lock.version = version;
  if (lock.packages?.[""]) lock.packages[""].version = version;
  if (lock.packages?.["apps/client"]) lock.packages["apps/client"].version = version;
});

syncText("Cargo.toml", (s) =>
  s.replace(/(\[workspace\.package\][^[]*?\nversion\s*=\s*")[^"]*(")/, `$1${version}$2`),
);

syncText("Cargo.lock", (s) =>
  s.replace(/(name = "otter-(?:core|app)"\r?\nversion = ")[^"]*(")/g, `$1${version}$2`),
);

// --- Frontend -----------------------------------------------------------------
syncText(rel(path.join(CLIENT_DIR, "index.html")), (s) =>
  s.replace(/<title>[^<]*<\/title>/, `<title>${app.productName}</title>`),
);

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
