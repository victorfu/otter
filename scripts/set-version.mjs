#!/usr/bin/env node
// Set the app version in package.json (the single source) and propagate it.
//   npm run version:set 1.2.3
import path from "node:path";
import { ROOT, SEMVER, c, readJson, run, writeJson } from "./lib/util.mjs";

const version = process.argv[2]?.replace(/^v/, "");
const match = version?.match(SEMVER);
if (!match) {
  console.error(c.red(`Usage: npm run version:set <semver>   (got "${process.argv[2] ?? ""}")`));
  process.exit(1);
}

// WiX (MSI) only accepts numeric pre-release identifiers, e.g. 1.2.3-4.
const pre = match[4];
if (pre && !/^\d+$/.test(pre)) {
  console.warn(
    c.yellow(`⚠ Pre-release "${pre}" is not numeric; the Windows MSI bundle will be skipped.`),
  );
}

const file = path.join(ROOT, "package.json");
const pkg = readJson(file);
const previous = pkg.version;
pkg.version = version;
writeJson(file, pkg);
run("oxfmt", ["package.json"]);
run("node", ["scripts/sync-app-config.mjs"]);
console.log(c.green(`Version ${previous} → ${version}`));
console.log(c.dim(`Next: git commit -am "chore(release): v${version}" && git tag v${version}`));
