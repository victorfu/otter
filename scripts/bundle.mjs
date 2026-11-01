#!/usr/bin/env node
// Build release installers for the current platform, then collect them into
// release/<version>/<platform>/ with checksums and latest.json.
//
//   npm run bundle                    # release flavour
//   npm run bundle -- --dev           # "MyApp Dev" flavour (installs side by side, no updater)
//   npm run bundle -- --no-universal  # macOS: build for the host arch only
//   npm run bundle -- --target <triple>
//
// Installers must be built on their own OS (no cross-compilation):
//   Windows → NSIS + MSI · macOS → .app + .dmg · Linux → AppImage + .deb + .rpm
//
// Signing is optional. Each missing secret produces a warning and an unsigned
// (but working) build. See RELEASING.md and .env.example.
import { rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { ROOT, SEMVER, TAURI_DIR, c, loadDotEnv, readJson, rootPackage, run } from "./lib/util.mjs";

const argv = process.argv.slice(2);
const dev = argv.includes("--dev");
const flagValue = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};

loadDotEnv();
// Empty values in .env would look "set" to the Tauri CLI; treat them as unset.
for (const [k, v] of Object.entries(process.env)) {
  if (v === "" && /^(TAURI_SIGNING|APPLE_|WINDOWS_|AZURE_)/.test(k)) delete process.env[k];
}

const version = rootPackage().version;
const warnings = [];
const warn = (msg) => {
  warnings.push(msg);
  console.warn(c.yellow(`⚠ ${msg}`));
};

// --- Target & bundle formats ---------------------------------------------------
let target = flagValue("--target");
if (!target && process.platform === "darwin" && !argv.includes("--no-universal")) {
  target = "universal-apple-darwin";
}
const bundles = {
  win32: ["nsis", "msi"],
  darwin: ["app", "dmg"],
  linux: ["appimage", "deb", "rpm"],
}[process.platform];
if (!bundles) throw new Error(`Unsupported platform: ${process.platform}`);

const pre = version.match(SEMVER)?.[4];
if (process.platform === "win32" && pre && !/^\d+$/.test(pre)) {
  warn(`MSI needs a numeric pre-release (got "${pre}"); building NSIS only.`);
  bundles.splice(bundles.indexOf("msi"), 1);
}

// --- Config layers ---------------------------------------------------------------
const overrides = { bundle: { windows: {}, macOS: {} } };
const configs = dev ? [] : [path.join(TAURI_DIR, "tauri.release.conf.json")];

// Updater artifacts (.sig) need the private key.
if (dev) {
  console.log(c.dim("Dev flavour: updater artifacts disabled."));
} else if (!process.env.TAURI_SIGNING_PRIVATE_KEY) {
  warn(
    "TAURI_SIGNING_PRIVATE_KEY not set: skipping updater artifacts (run `npm run updater:keygen`).",
  );
  overrides.bundle.createUpdaterArtifacts = false;
} else if (!readJson(configs[0]).plugins?.updater?.pubkey) {
  warn("No updater pubkey in tauri.release.conf.json: installed apps could not verify updates.");
}

if (process.platform === "win32") configureWindowsSigning();
if (process.platform === "darwin") configureMacSigning();

const overridePath = path.join(tmpdir(), `myapp-bundle-overrides-${process.pid}.json`);
writeFileSync(overridePath, JSON.stringify(overrides));
configs.push(overridePath);

// --- Build -----------------------------------------------------------------------
const bundleDir = path.join(ROOT, "target", ...(target ? [target] : []), "release", "bundle");
rmSync(bundleDir, { recursive: true, force: true }); // never collect stale artifacts

const args = ["build", "--bundles", bundles.join(",")];
if (target) args.push("--target", target);
for (const cfg of configs) args.push("--config", cfg);

console.log(c.bold(c.cyan(`\n▶ tauri ${args.join(" ")}\n`)));
try {
  run("tauri", args);
} finally {
  rmSync(overridePath, { force: true });
}

// --- Collect -----------------------------------------------------------------------
const collectArgs = ["scripts/collect-release.mjs", ...(dev ? ["--dev"] : [])];
if (target) collectArgs.push("--target", target);
run("node", collectArgs);
if (!dev) run("node", ["scripts/make-latest-json.mjs"]);

if (warnings.length) {
  console.log(c.yellow(`\nBuilt with ${warnings.length} warning(s):`));
  for (const w of warnings) console.log(c.yellow(`  • ${w}`));
}

// --- Signing helpers -----------------------------------------------------------------
function configureWindowsSigning() {
  const env = process.env;
  if (env.WINDOWS_CERTIFICATE_THUMBPRINT) {
    Object.assign(overrides.bundle.windows, {
      certificateThumbprint: env.WINDOWS_CERTIFICATE_THUMBPRINT,
      digestAlgorithm: "sha256",
      timestampUrl: env.WINDOWS_TIMESTAMP_URL || "http://timestamp.digicert.com",
    });
    console.log(c.green("Windows: signing with certificate from the certificate store."));
  } else if (
    env.AZURE_CLIENT_ID &&
    env.AZURE_TRUSTED_SIGNING_ENDPOINT &&
    env.AZURE_TRUSTED_SIGNING_ACCOUNT &&
    env.AZURE_TRUSTED_SIGNING_PROFILE
  ) {
    // trusted-signing-cli reads AZURE_CLIENT_ID / AZURE_CLIENT_SECRET / AZURE_TENANT_ID.
    overrides.bundle.windows.signCommand = [
      "trusted-signing-cli",
      "-e",
      env.AZURE_TRUSTED_SIGNING_ENDPOINT,
      "-a",
      env.AZURE_TRUSTED_SIGNING_ACCOUNT,
      "-c",
      env.AZURE_TRUSTED_SIGNING_PROFILE,
      "-d",
      readJson(path.join(ROOT, "app.json")).productName,
      "%1",
    ].join(" ");
    console.log(c.green("Windows: signing with Azure Trusted Signing."));
  } else {
    warn(
      "Windows code signing not configured: installers are unsigned (SmartScreen will warn users).",
    );
  }
}

function configureMacSigning() {
  const env = process.env;
  if (env.APPLE_SIGNING_IDENTITY || env.APPLE_CERTIFICATE) {
    console.log(c.green("macOS: signing with Developer ID (from APPLE_* env vars)."));
    if (!(env.APPLE_ID && env.APPLE_PASSWORD && env.APPLE_TEAM_ID)) {
      warn("APPLE_ID / APPLE_PASSWORD / APPLE_TEAM_ID not set: the app will not be notarized.");
    }
  } else {
    // Ad-hoc signature: required to launch on Apple Silicon, but Gatekeeper will still block it.
    overrides.bundle.macOS.signingIdentity = "-";
    warn(
      "macOS signing not configured: ad-hoc signed, not notarized (users must right-click → Open).",
    );
  }
}
