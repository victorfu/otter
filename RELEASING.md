# Releasing

- [1. Version numbers](#1-version-numbers)
- [2. Building installers locally](#2-building-installers-locally)
- [3. Updater signing keys](#3-updater-signing-keys)
- [4. Code signing](#4-code-signing)
- [5. Auto-update (latest.json)](#5-auto-update-latestjson)
- [6. Connecting GitHub](#6-connecting-github)
- [7. Release checklist](#7-release-checklist)

## 1. Version numbers

The **only** source is `version` in the root `package.json`. Everything else is derived from it:

```bash
npm run version:set 1.2.3
```

This updates `package.json`, `apps/client/package.json`, `package-lock.json`, `Cargo.toml` (`workspace.package.version`), `Cargo.lock`, and `tauri.conf.json`. `npm run check` fails if any of them drift.

Rules:

- Use [SemVer](https://semver.org): `MAJOR.MINOR.PATCH`. The updater only installs versions **greater** than the running one.
- Pre-releases must be **numeric** (`1.2.0-1`, not `1.2.0-beta.1`), because Windows MSI (WiX) rejects anything else. `npm run bundle` skips the MSI with a warning when the pre-release is not numeric.
- The git tag must be `v<version>`. The release workflow checks this.

## 2. Building installers locally

```bash
npm run bundle             # release flavour: Otter, cc.otter
npm run bundle -- --dev    # dev flavour: "Otter Dev", cc.otter.dev, no updater
```

| Platform | Output                   | Notes                                                                              |
| -------- | ------------------------ | ---------------------------------------------------------------------------------- |
| Windows  | NSIS `.exe`, MSI `.msi`  | NSIS installs per-user (no admin)                                                  |
| macOS    | `.app`, `.dmg`           | Universal (`universal-apple-darwin`) by default; `-- --no-universal` for host-only |
| Linux    | AppImage, `.deb`, `.rpm` | Build on the oldest distro you support (Ubuntu 22.04)                              |

**Each platform's installers must be built on that platform.** We do not cross-compile. Run the same command on each OS (or let the release workflow do it).

What `bundle` does:

1. Loads `.env`. Each missing signing secret prints a warning and the build continues unsigned.
2. Runs `tauri build` with `tauri.conf.json` + `tauri.release.conf.json` (JSON Merge Patch) plus generated overrides for signing.
3. `scripts/collect-release.mjs` copies the installers, updater bundles and `.sig` files into `release/<version>/<platform>/` and writes `SHA256SUMS.txt`.
4. `scripts/make-latest-json.mjs` writes `release/<version>/latest.json`.

```text
release/0.1.0/
├── latest.json
└── windows/
    ├── Otter_0.1.0_x64-setup.exe
    ├── Otter_0.1.0_x64-setup.exe.sig
    ├── Otter_0.1.0_x64_en-US.msi
    ├── Otter_0.1.0_x64_en-US.msi.sig
    └── SHA256SUMS.txt
```

To combine platforms into one `latest.json`, copy each machine's `release/<version>/<platform>/` folder into one `release/<version>/` and run `npm run release:latest-json`.

Dev and release flavours have different product names and identifiers, so they install side by side and never share data.

## 3. Updater signing keys

Updates are verified with a minisign key pair (independent of OS code signing).

```bash
npm run updater:keygen
```

- The private key goes to `~/.tauri/<identifier>.updater.key`, **outside the repo**.
- Its path and a generated password go into `.env` (`TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`). `.env` is git-ignored.
- The public key is written to `plugins.updater.pubkey` in `tauri.release.conf.json` (safe to commit).

> ⚠️ **Back up the private key and password** in a password manager. If you lose them, installed copies can never auto-update again. If you regenerate the key (`-- --force`), users must reinstall manually once.

## 4. Code signing

All signing is optional locally. Without it you get a working, unsigned build and a warning.

### macOS (Developer ID + notarization)

Set these in `.env` (local) or as GitHub secrets (CI):

| Variable                     | Value                                                      |
| ---------------------------- | ---------------------------------------------------------- |
| `APPLE_CERTIFICATE`          | base64 of your exported `Developer ID Application` `.p12`  |
| `APPLE_CERTIFICATE_PASSWORD` | password of that `.p12`                                    |
| `APPLE_SIGNING_IDENTITY`     | e.g. `Developer ID Application: Example Inc. (TEAMID1234)` |
| `APPLE_ID`                   | Apple ID email (notarization)                              |
| `APPLE_PASSWORD`             | app-specific password from appleid.apple.com               |
| `APPLE_TEAM_ID`              | 10-character team ID                                       |

```bash
base64 -i certificate.p12 | pbcopy   # → APPLE_CERTIFICATE
```

Locally, if the certificate is already in your keychain, `APPLE_SIGNING_IDENTITY` alone is enough. Without any of these the app is **ad-hoc signed** (it runs on Apple Silicon, but Gatekeeper requires right-click → Open). It is notarized only when `APPLE_ID`, `APPLE_PASSWORD` and `APPLE_TEAM_ID` are all set.

### Windows

Pick one:

- **Certificate in the Windows certificate store** (OV/EV): set `WINDOWS_CERTIFICATE_THUMBPRINT` (and optionally `WINDOWS_TIMESTAMP_URL`). In CI, provide `WINDOWS_CERTIFICATE` (base64 `.pfx`) and `WINDOWS_CERTIFICATE_PASSWORD`. The workflow imports it and passes the thumbprint.
- **Azure Trusted Signing**: `cargo install trusted-signing-cli`, then set `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_TENANT_ID`, `AZURE_TRUSTED_SIGNING_ENDPOINT`, `AZURE_TRUSTED_SIGNING_ACCOUNT`, `AZURE_TRUSTED_SIGNING_PROFILE` (local `npm run bundle` only. Add the same `signCommand` logic to `release.yml` if you use it in CI).

Unsigned installers work, but SmartScreen shows "Windows protected your PC".

### Linux

No OS signing is required. AppImages are covered by the updater `.sig`.

## 5. Auto-update (latest.json)

- The app checks `plugins.updater.endpoints` from `tauri.release.conf.json` (synced from `app.json` → `updaterEndpoint`).
- While the endpoint is a placeholder (`example.com`), the dev build has no endpoint, or the pubkey is empty, **Check for updates** shows "Updates are not set up yet" instead of failing.
- `latest.json` maps platform keys (`windows-x86_64`, `windows-x86_64-msi`, `darwin-aarch64`, `darwin-x86_64`, `linux-x86_64`) to download URLs and signatures. Download URLs are `UPDATER_DOWNLOAD_BASE_URL/<file>` (set in `.env`, or `--base-url`).
- On Windows the update installs in `passive` mode and restarts the app.

## 6. Connecting GitHub

When you create the repository:

1. **Create the repo** and push (`git remote add origin …`, `git push -u origin main`). CI (`.github/workflows/ci.yml`) starts running on pushes to `main` and on PRs.
2. **Point the updater at GitHub Releases.** In `app.json`, set:

   ```json
   "updaterEndpoint": "https://github.com/<owner>/<repo>/releases/latest/download/latest.json"
   ```

   Then run `npm run sync` and commit. In `.env`, set `UPDATER_DOWNLOAD_BASE_URL=https://github.com/<owner>/<repo>/releases/download/v{version}` for local `latest.json` generation.

3. **Add repository secrets** (Settings → Secrets and variables → Actions):

   | Secret                               | Required?   | Content                                             |
   | ------------------------------------ | ----------- | --------------------------------------------------- |
   | `TAURI_SIGNING_PRIVATE_KEY`          | for updates | **contents** of `~/.tauri/<identifier>.updater.key` |
   | `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | for updates | its password (from `.env`)                          |
   | `APPLE_CERTIFICATE`                  | optional    | base64 `.p12`                                       |
   | `APPLE_CERTIFICATE_PASSWORD`         | optional    |                                                     |
   | `APPLE_SIGNING_IDENTITY`             | optional    |                                                     |
   | `APPLE_ID`                           | optional    | notarization                                        |
   | `APPLE_PASSWORD`                     | optional    | app-specific password                               |
   | `APPLE_TEAM_ID`                      | optional    |                                                     |
   | `WINDOWS_CERTIFICATE`                | optional    | base64 `.pfx`                                       |
   | `WINDOWS_CERTIFICATE_PASSWORD`       | optional    |                                                     |

   `GITHUB_TOKEN` is provided automatically. The workflow needs `contents: write`, which is already declared.

4. **Release:**

   ```bash
   npm run version:set 1.0.0
   git commit -am "chore(release): v1.0.0"
   git tag v1.0.0
   git push origin main --tags
   ```

   `.github/workflows/release.yml` builds Windows, macOS (aarch64 and x86_64) and Linux, then creates a **draft** release with installers, updater bundles, `.sig` files and `latest.json`. Review it and click **Publish**. `releases/latest/download/…` only resolves for published releases.

5. Replace `"Otter"` in `release.yml` → `releaseName` if you renamed the product.

## 7. Release checklist

- [ ] `npm run check && npm test` pass
- [ ] `npm run version:set X.Y.Z` and commit
- [ ] Update release notes
- [ ] Tag `vX.Y.Z` and push (or `npm run bundle` on each OS for a manual release)
- [ ] Smoke-test installers from the draft release on each OS
- [ ] Publish the release, then verify an older install sees the update
