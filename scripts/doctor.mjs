#!/usr/bin/env node
// Environment check: lists what is missing on this machine and how to install it.
// Usage: npm run doctor
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { ROOT, c, isWindows, loadDotEnv, rootPackage, tryOutput } from "./lib/util.mjs";

const results = [];
const ok = (name, detail) => results.push({ level: "ok", name, detail });
const warn = (name, detail, fix) => results.push({ level: "warn", name, detail, fix });
const fail = (name, detail, fix) => results.push({ level: "fail", name, detail, fix });
/** Record `ok` when `cond` holds, otherwise a failure (or a warning with `level: 'warn'`). */
function verify(cond, name, okDetail, { level = "fail", detail, fix }) {
  if (cond) ok(name, okDetail);
  else results.push({ level, name, detail, fix });
}

const firstLine = (s) => s?.split(/\r?\n/)[0].trim();
const semverOf = (s) =>
  s
    ?.match(/(\d+)\.(\d+)\.(\d+)/)
    ?.slice(1)
    .map(Number);

// --- Common -----------------------------------------------------------------
const git = tryOutput("git", ["--version"]);
verify(git, "Git", firstLine(git), { detail: "not found", fix: installHint("git") });

const wantNode = readFileSync(path.join(ROOT, ".node-version"), "utf8").trim();
const haveNode = process.versions.node;
if (haveNode === wantNode) ok("Node.js", `v${haveNode}`);
else if (haveNode.split(".")[0] === wantNode.split(".")[0])
  warn("Node.js", `v${haveNode} (project pins ${wantNode})`, `fnm install ${wantNode} && fnm use`);
else fail("Node.js", `v${haveNode}, need ${wantNode}`, `fnm install ${wantNode} && fnm use`);

const wantNpm = rootPackage().packageManager.replace(/^npm@/, "");
const haveNpm = tryOutput("npm", ["--version"]);
if (!haveNpm) fail("npm", "not found", "Reinstall Node.js");
else if (haveNpm === wantNpm) ok("npm", haveNpm);
else warn("npm", `${haveNpm} (packageManager pins ${wantNpm})`, `npm install -g npm@${wantNpm}`);

const toolchain = readFileSync(path.join(ROOT, "rust-toolchain.toml"), "utf8").match(
  /channel\s*=\s*"([^"]+)"/,
)?.[1];
const rustup = tryOutput("rustup", ["--version"]);
if (!rustup) {
  fail("rustup", "not found", installHint("rustup"));
} else {
  ok("rustup", firstLine(rustup));
  const installed = tryOutput("rustup", ["toolchain", "list"]) ?? "";
  if (installed.split(/\r?\n/).some((l) => l.startsWith(toolchain))) {
    ok("Rust toolchain", `${toolchain} (from rust-toolchain.toml)`);
    const comps =
      tryOutput("rustup", ["component", "list", "--installed", "--toolchain", toolchain]) ?? "";
    for (const comp of ["rustfmt", "clippy"]) {
      verify(comps.includes(comp), `  ${comp}`, "installed", {
        detail: "missing",
        fix: `rustup component add ${comp} --toolchain ${toolchain}`,
      });
    }
    if (process.platform === "darwin") {
      const targets =
        tryOutput("rustup", ["target", "list", "--installed", "--toolchain", toolchain]) ?? "";
      for (const t of ["aarch64-apple-darwin", "x86_64-apple-darwin"]) {
        verify(targets.includes(t), `  target ${t}`, "installed", {
          level: "warn",
          detail: "missing (needed for universal builds)",
          fix: `rustup target add ${t} --toolchain ${toolchain}`,
        });
      }
    }
  } else {
    fail(
      "Rust toolchain",
      `${toolchain} not installed`,
      `rustup toolchain install ${toolchain} --profile minimal -c rustfmt,clippy`,
    );
  }
  const cargo = tryOutput("cargo", ["--version"]);
  verify(cargo, "cargo", firstLine(cargo), { detail: "not found", fix: installHint("rustup") });
}

// --- Platform specific ------------------------------------------------------
if (isWindows) checkWindows();
else if (process.platform === "darwin") checkMac();
else checkLinux();

// --- Project state ----------------------------------------------------------
verify(existsSync(path.join(ROOT, "node_modules", ".bin")), "node_modules", "installed", {
  level: "warn",
  detail: "not installed",
  fix: "npm run init",
});

loadDotEnv();
if (!existsSync(path.join(ROOT, ".env"))) {
  warn(".env", "missing (only needed for signed release bundles)", "copy .env.example to .env");
} else if (!process.env.TAURI_SIGNING_PRIVATE_KEY) {
  warn(
    "Updater signing key",
    "TAURI_SIGNING_PRIVATE_KEY not set; bundles will skip updater artifacts",
    "npm run updater:keygen",
  );
} else {
  const key = process.env.TAURI_SIGNING_PRIVATE_KEY;
  const looksLikePath = !key.startsWith("dW50cnVzdGVk"); // base64 of "untrusted"
  verify(
    !looksLikePath || existsSync(key),
    "Updater signing key",
    looksLikePath ? key : "provided inline",
    {
      detail: `file not found: ${key}`,
      fix: "npm run updater:keygen",
    },
  );
}

// --- Report -----------------------------------------------------------------
const icon = { ok: c.green("✔"), warn: c.yellow("⚠"), fail: c.red("✖") };
console.log(c.bold(`\nEnvironment check (${process.platform}/${process.arch})\n`));
for (const r of results) {
  console.log(`${icon[r.level]} ${r.name.padEnd(28)} ${c.dim(r.detail ?? "")}`);
  if (r.fix && r.level !== "ok") console.log(`  ${" ".repeat(28)} ${c.cyan("→ " + r.fix)}`);
}
const fails = results.filter((r) => r.level === "fail").length;
const warns = results.filter((r) => r.level === "warn").length;
console.log(
  `\n${fails ? c.red(`${fails} problem(s)`) : c.green("All required tools found")}` +
    (warns ? c.yellow(`, ${warns} warning(s)`) : "") +
    ". See DEVELOPMENT.md for setup details.\n",
);
process.exit(fails ? 1 : 0);

// --- Helpers ----------------------------------------------------------------
function installHint(tool) {
  const hints = {
    win32: { git: "winget install Git.Git", rustup: "winget install Rustlang.Rustup" },
    darwin: {
      git: "xcode-select --install",
      rustup: "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh",
    },
    linux: {
      git: "sudo apt install git",
      rustup: "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh",
    },
  };
  return hints[process.platform]?.[tool];
}

function checkWindows() {
  const winget = tryOutput("winget", ["--version"]);
  verify(winget, "winget", winget, {
    level: "warn",
    detail: "not found (optional, used for installs)",
    fix: 'Install "App Installer" from Microsoft Store',
  });

  const vswhere = path.join(
    process.env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)",
    "Microsoft Visual Studio",
    "Installer",
    "vswhere.exe",
  );
  const vs = existsSync(vswhere)
    ? tryOutput(vswhere, [
        "-products",
        "*",
        "-requires",
        "Microsoft.VisualStudio.Component.VC.Tools.x86.x64",
        "-property",
        "displayName",
      ])
    : null;
  verify(vs, "MSVC C++ Build Tools", firstLine(vs), {
    detail: "Desktop development with C++ not found",
    fix: 'winget install Microsoft.VisualStudio.2022.BuildTools --override "--wait --passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"',
  });

  const key = "Microsoft\\EdgeUpdate\\Clients\\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}";
  const webview = [
    `HKLM\\SOFTWARE\\WOW6432Node\\${key}`,
    `HKLM\\SOFTWARE\\${key}`,
    `HKCU\\Software\\${key}`,
  ]
    .map((k) => tryOutput("reg", ["query", k, "/v", "pv"]))
    .map((out) => out?.match(/pv\s+REG_SZ\s+([\d.]+)/)?.[1])
    .find((v) => v && v !== "0.0.0.0");
  verify(webview, "WebView2 Runtime", webview, {
    detail: "not found",
    fix: "winget install Microsoft.EdgeWebView2Runtime",
  });

  const rustc = tryOutput("rustc", ["-vV"]);
  const host = rustc?.match(/host:\s*(\S+)/)?.[1];
  if (host && host !== "x86_64-pc-windows-msvc" && host !== "aarch64-pc-windows-msvc")
    fail("Rust host target", host, "rustup set default-host x86_64-pc-windows-msvc");
}

function checkMac() {
  const xcode = tryOutput("xcode-select", ["-p"]);
  verify(xcode, "Xcode Command Line Tools", xcode, {
    detail: "not found",
    fix: "xcode-select --install",
  });
}

function checkLinux() {
  const pkgs = [
    "libwebkit2gtk-4.1-dev",
    "build-essential",
    "curl",
    "wget",
    "file",
    "libxdo-dev",
    "libssl-dev",
    "libayatana-appindicator3-dev",
    "librsvg2-dev",
  ];
  if (!tryOutput("dpkg", ["--version"])) {
    warn(
      "System packages",
      "dpkg not found; cannot verify (non-Debian distro?)",
      "See DEVELOPMENT.md",
    );
    return;
  }
  const missing = pkgs.filter(
    (p) => !/Status: install ok installed/.test(tryOutput("dpkg", ["-s", p]) ?? ""),
  );
  verify(missing.length === 0, "System packages", "webkit2gtk-4.1 and build deps installed", {
    detail: `missing: ${missing.join(", ")}`,
    fix: `sudo apt install ${missing.join(" ")}`,
  });
  const semver = semverOf(tryOutput("pkg-config", ["--modversion", "webkit2gtk-4.1"]));
  if (semver) ok("  webkit2gtk-4.1", semver.join("."));
}
