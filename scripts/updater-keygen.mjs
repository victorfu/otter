#!/usr/bin/env node
// Generate the updater signing key pair.
//   npm run updater:keygen              # ~/.tauri/<identifier>.updater.key
//   npm run updater:keygen -- --force   # overwrite an existing key (old builds can no longer update!)
//
// - The private key is written OUTSIDE the repo; its path and password go to .env.
// - The public key is written to tauri.release.conf.json.
import { randomBytes } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { ROOT, TAURI_DIR, appConfig, c, readJson, run, writeJson } from "./lib/util.mjs";

const force = process.argv.includes("--force");
const keyDir = path.join(homedir(), ".tauri");
const keyPath = path.join(keyDir, `${appConfig().identifier}.updater.key`);

if (path.resolve(keyPath).startsWith(ROOT))
  throw new Error("Refusing to write a key inside the repo");
if (existsSync(keyPath) && !force) {
  console.error(c.red(`Key already exists: ${keyPath}`));
  console.error(
    "Use --force to replace it. Installed apps signed with the old key won't accept updates.",
  );
  process.exit(1);
}

mkdirSync(keyDir, { recursive: true });
const password = randomBytes(24).toString("base64url");
run(
  "tauri",
  [
    "signer",
    "generate",
    "--ci",
    "--write-keys",
    keyPath,
    "--password",
    password,
    ...(force ? ["--force"] : []),
  ],
  {
    capture: true,
  },
);
const pubkey = readFileSync(`${keyPath}.pub`, "utf8").trim();

// Public key → release config.
const confPath = path.join(TAURI_DIR, "tauri.release.conf.json");
const conf = readJson(confPath);
conf.plugins.updater.pubkey = pubkey;
writeJson(confPath, conf);
run("oxfmt", [confPath]);

// Private key path + password → .env (git-ignored).
const envPath = path.join(ROOT, ".env");
if (!existsSync(envPath)) copyFileSync(path.join(ROOT, ".env.example"), envPath);
let env = readFileSync(envPath, "utf8");
const setVar = (name, value) => {
  const line = `${name}=${value}`;
  const re = new RegExp(`^${name}=.*$`, "m");
  env = re.test(env) ? env.replace(re, () => line) : `${env.trimEnd()}\n${line}\n`;
};
setVar("TAURI_SIGNING_PRIVATE_KEY", keyPath);
setVar("TAURI_SIGNING_PRIVATE_KEY_PASSWORD", password);
writeFileSync(envPath, env);

console.log(c.green(`✔ Private key: ${keyPath}`));
console.log(c.green("✔ Public key written to crates-tauri/app/tauri.release.conf.json"));
console.log(c.green("✔ Key path and password written to .env"));
console.log(
  c.yellow(
    "⚠ Back up the private key and password (e.g. in a password manager). Losing them means\n" +
      "  installed apps can never be updated again. Never commit them.",
  ),
);
