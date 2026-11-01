#!/usr/bin/env node
// Copy installers + updater artifacts from target/**/bundle into
// release/<version>/<platform>/ and write SHA256SUMS.txt.
//   npm run release:collect [-- --dev] [-- --target <triple>]
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { ROOT, c, platformName, rootPackage } from "./lib/util.mjs";

const argv = process.argv.slice(2);
const dev = argv.includes("--dev");
const ti = argv.indexOf("--target");
const target = ti >= 0 ? argv[ti + 1] : undefined;
const version = rootPackage().version;

const bundleDir = path.join(ROOT, "target", ...(target ? [target] : []), "release", "bundle");
if (!existsSync(bundleDir)) {
  console.error(c.red(`No bundle output at ${bundleDir}. Run \`npm run bundle\` first.`));
  process.exit(1);
}

const ARTIFACT = /\.(exe|msi|dmg|app\.tar\.gz|AppImage|deb|rpm)(\.sig)?$/;
const dest = path.join(ROOT, "release", version, dev ? `${platformName}-dev` : platformName);
rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });

function archOf(triple) {
  if (triple?.startsWith("universal")) return "universal";
  if (triple) return triple.split("-")[0];
  return process.arch === "arm64" ? "aarch64" : "x86_64";
}

const collected = [];
for (const kind of readdirSync(bundleDir)) {
  const dir = path.join(bundleDir, kind);
  if (!statSync(dir).isDirectory()) continue;
  for (const file of readdirSync(dir)) {
    if (!ARTIFACT.test(file) || !statSync(path.join(dir, file)).isFile()) continue;
    // macOS updater archives are named "<Product>.app.tar.gz"; add version + arch
    // so builds for different architectures don't collide.
    const name = file.replace(
      /^(.*)\.app\.tar\.gz/,
      (_, p) => `${p}_${version}_${archOf(target)}.app.tar.gz`,
    );
    copyFileSync(path.join(dir, file), path.join(dest, name));
    collected.push(name);
  }
}

if (!collected.length) {
  console.error(c.red(`No artifacts found in ${bundleDir}`));
  process.exit(1);
}

const sums = collected.toSorted().map(
  (f) =>
    `${createHash("sha256")
      .update(readFileSync(path.join(dest, f)))
      .digest("hex")}  ${f}`,
);
writeFileSync(path.join(dest, "SHA256SUMS.txt"), `${sums.join("\n")}\n`);

console.log(c.green(`\nCollected into ${path.relative(ROOT, dest)}/`));
for (const f of collected.toSorted()) console.log(`  ${f}`);
console.log("  SHA256SUMS.txt");
