#!/usr/bin/env node
// Build the updater manifest release/<version>/latest.json from every
// platform folder collected so far (copy other machines' release/<version>/<os>/
// folders here first to produce a combined manifest).
//
//   npm run release:latest-json [-- --base-url <url>] [-- --notes "text"]
//
// Download URLs are <base-url>/<file>. The base URL comes from --base-url, else
// UPDATER_DOWNLOAD_BASE_URL in .env; "{version}" is substituted.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ROOT, appConfig, c, loadDotEnv, rootPackage } from "./lib/util.mjs";

loadDotEnv();
const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};

const version = rootPackage().version;
const PLACEHOLDER = "https://github.com/OWNER/REPO/releases/download/v{version}";
const baseUrl = (flag("--base-url") || process.env.UPDATER_DOWNLOAD_BASE_URL || PLACEHOLDER)
  .replaceAll("{version}", version)
  .replace(/\/+$/, "");
const notes = flag("--notes") ?? `${appConfig().productName} v${version}`;

const releaseDir = path.join(ROOT, "release", version);
if (!existsSync(releaseDir)) {
  console.error(c.red(`Nothing collected in ${releaseDir}. Run \`npm run bundle\` first.`));
  process.exit(1);
}

const normArch = (a) => ({ x64: "x86_64", amd64: "x86_64", arm64: "aarch64", x86: "i686" })[a] ?? a;

/** Map one updater artifact to `[platformKey, …]`, or `[]` if it isn't one. */
function platformKeys(os, file) {
  if (os === "windows") {
    const m = file.match(/_(x64|x86|arm64)(?:-setup\.exe|_[\w-]+\.msi)$/);
    if (!m) return [];
    const base = `windows-${normArch(m[1])}`;
    // NSIS is the default for `windows-<arch>`; both installers get explicit keys.
    return file.endsWith(".msi") ? [`${base}-msi`] : [base, `${base}-nsis`];
  }
  if (os === "macos") {
    const m = file.match(/_(universal|aarch64|x86_64)\.app\.tar\.gz$/);
    if (!m) return [];
    return m[1] === "universal" ? ["darwin-aarch64", "darwin-x86_64"] : [`darwin-${m[1]}`];
  }
  if (os === "linux") {
    const m = file.match(/_(amd64|aarch64|x86_64)\.AppImage$/);
    return m ? [`linux-${normArch(m[1])}`, `linux-${normArch(m[1])}-appimage`] : [];
  }
  return [];
}

const platforms = {};
for (const os of ["windows", "macos", "linux"]) {
  const dir = path.join(releaseDir, os);
  if (!existsSync(dir)) continue;
  for (const sig of readdirSync(dir).filter((f) => f.endsWith(".sig"))) {
    const file = sig.slice(0, -4);
    const signature = readFileSync(path.join(dir, sig), "utf8").trim();
    for (const key of platformKeys(os, file)) {
      platforms[key] = { signature, url: `${baseUrl}/${encodeURIComponent(file)}` };
    }
  }
}

if (!Object.keys(platforms).length) {
  console.warn(
    c.yellow(
      "⚠ No signed updater artifacts found (.sig); latest.json not written. Set up the key with `npm run updater:keygen`.",
    ),
  );
  process.exit(0);
}

const manifest = { version, notes, pub_date: new Date().toISOString(), platforms };
const out = path.join(releaseDir, "latest.json");
writeFileSync(out, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(c.green(`Wrote ${path.relative(ROOT, out)} (${Object.keys(platforms).join(", ")})`));
if (baseUrl.includes("OWNER/REPO")) {
  console.warn(
    c.yellow("⚠ Download URLs use a placeholder base URL; set UPDATER_DOWNLOAD_BASE_URL in .env."),
  );
}
