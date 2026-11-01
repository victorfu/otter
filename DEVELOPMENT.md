# Development

Everything you need to set up a machine, run the app, and understand the layout.
For packaging and publishing see [RELEASING.md](RELEASING.md).

- [1. Environment setup](#1-environment-setup)
  - [Windows 10/11](#windows-1011)
  - [macOS](#macos)
  - [Ubuntu 22.04](#ubuntu-2204)
- [2. Daily commands](#2-daily-commands)
- [3. Project structure](#3-project-structure)
- [4. How the layers connect](#4-how-the-layers-connect)
- [5. Dev vs release builds](#5-dev-vs-release-builds)
- [6. Renaming the app](#6-renaming-the-app)

Pinned versions (change them in one place):

| What              | Where                                       |
| ----------------- | ------------------------------------------- |
| Node.js           | `.node-version`                             |
| npm               | `package.json` → `packageManager`           |
| Rust toolchain    | `rust-toolchain.toml` (installed by rustup) |
| npm dependencies  | `package.json` files (exact versions)       |
| Rust dependencies | `Cargo.toml` files (`=x.y.z`)               |

After installing anything, **restart your terminal**, then run `npm run doctor`.
It checks every item below and prints the exact command for anything missing.

## 1. Environment setup

### Windows 10/11

1. **winget** ships with "App Installer" (Microsoft Store). Check it with `winget --version`.
2. Install the tools:

   ```powershell
   winget install Git.Git
   winget install Microsoft.VisualStudio.2022.BuildTools --override "--wait --passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
   winget install Microsoft.EdgeWebView2Runtime   # usually preinstalled on Windows 10/11
   winget install Rustlang.Rustup
   winget install Schniz.fnm
   ```

   The Build Tools installer needs administrator rights.

3. Rust must use the MSVC host:

   ```powershell
   rustup default stable-x86_64-pc-windows-msvc
   ```

   (The project pins its own toolchain in `rust-toolchain.toml`, so your global default doesn't matter for this repo.)

4. Make fnm switch Node versions automatically from `.node-version`. Add this line to your PowerShell profile (`notepad $PROFILE`):

   ```powershell
   fnm env --use-on-cd --version-file-strategy=recursive --shell powershell | Out-String | Invoke-Expression
   ```

   For **cmd**, create or extend an AutoRun script (see the [fnm README](https://github.com/Schniz/fnm#shell-setup)).

5. In the repo:

   ```powershell
   fnm install          # installs the version in .node-version
   npm install -g npm@11.19.1   # match packageManager
   npm run init
   npm run doctor
   ```

### macOS

```bash
xcode-select --install
brew install fnm
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add aarch64-apple-darwin x86_64-apple-darwin   # universal builds
```

Add fnm to your shell (`~/.zshrc`):

```bash
eval "$(fnm env --use-on-cd --version-file-strategy=recursive --shell zsh)"
```

Then, in the repo:

```bash
fnm install
npm install -g npm@11.19.1
npm run init      # also adds both macOS targets to the pinned toolchain
npm run doctor
```

### Ubuntu 22.04

```bash
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
curl -fsSL https://fnm.vercel.app/install | bash
```

Add fnm to `~/.bashrc`:

```bash
eval "$(fnm env --use-on-cd --version-file-strategy=recursive --shell bash)"
```

Then, in the repo:

```bash
fnm install
npm install -g npm@11.19.1
npm run init
npm run doctor
```

## 2. Daily commands

All scripts work in PowerShell, cmd, bash and zsh. Any logic lives in `scripts/*.mjs`.

| Command                     | What it does                                                                                                        |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `npm run init`              | First-time setup: `npm install`, install the pinned Rust toolchain, `cargo fetch`, create `.env`                    |
| `npm start`                 | Dev mode: Vite HMR for the UI, and Rust rebuilds and restarts on save                                               |
| `npm run check`             | sync check, ts-rs bindings check, `tsc`, `oxlint`, `oxfmt --check`, `cargo fmt --check`, `cargo clippy -D warnings` |
| `npm run format`            | `oxfmt` + `cargo fmt --all`                                                                                         |
| `npm test`                  | Vitest (frontend) + `cargo test --workspace`                                                                        |
| `npm run doctor`            | Environment check                                                                                                   |
| `npm run bindings`          | Regenerate TypeScript types from Rust (ts-rs)                                                                       |
| `npm run sync`              | Push `app.json` / version into every config file                                                                    |
| `npm run icons`             | Regenerate all icon sizes from `crates-tauri/app/icons/source/*.png`                                                |
| `npm run version:set 1.2.3` | Set the version everywhere                                                                                          |
| `npm run bundle`            | Build release installers for this platform (see RELEASING.md)                                                       |

Tips:

- Rust logs from dev builds appear in the terminal and in the devtools console (right-click → Inspect).
- Changing a Rust type that derives `TS`? Run `npm run bindings` and commit the result. `npm run check` fails if they drift.

## 3. Project structure

```text
apps/client/              Frontend (React + Vite). UI only.
  src/bindings/           Generated by ts-rs. Do not edit.
  src/components/         UI components (+ *.test.tsx)
  src/lib/                ipc wrappers, queries, theme atoms
  src/routes/             Pages (TanStack Router, code-based)
crates/core/              Pure Rust business logic. No Tauri dependency, tested with cargo test.
crates-tauri/app/         Tauri shell: commands, plugins, windows, capabilities
  tauri.conf.json         Dev config (identifier *.dev, "MyApp Dev", dev icons)
  tauri.release.conf.json Merged over the dev config for release builds
  icons/source/           1024×1024 sources (release.png, dev.png)
  icons/{release,dev}/    Generated sizes
scripts/                  Cross-platform Node scripts (doctor, check, bundle, …)
.github/workflows/        CI + release (inactive until the repo is on GitHub)
app.json                  App identity: single source of truth
Cargo.toml                Rust workspace
package.json              npm workspaces root; `version` is the app version
```

## 4. How the layers connect

```text
React component ──► lib/ipc.ts `commands.greet()` ──► invoke("greet")
                                                       │
crates-tauri/app/src/commands.rs  #[tauri::command] greet ──► myapp_core::greet()
                                                       │
Result<Greeting, CommandError> ◄───────────────────────┘
```

- Types that cross the boundary derive `ts_rs::TS` and are exported to `apps/client/src/bindings/`.
- Every failing command rejects with `CommandError { code, message }`. `lib/ipc.ts` turns that into an `IpcError` that the UI can switch on by `code`.
- Add a command in 4 steps: logic in `crates/core`, a `#[tauri::command]` in `crates-tauri/app/src`, register it in `generate_handler!`, and add a typed wrapper in `lib/ipc.ts`.

## 5. Dev vs release builds

|                 | `npm start` (dev)             | `npm run bundle` (release)      |
| --------------- | ----------------------------- | ------------------------------- |
| Config          | `tauri.conf.json`             | + `tauri.release.conf.json`     |
| Product name    | MyApp Dev                     | MyApp                           |
| Identifier      | com.example.myapp.dev         | com.example.myapp               |
| Icons           | `icons/dev` (orange, striped) | `icons/release`                 |
| Data/config/log | `…/com.example.myapp.dev`     | `…/com.example.myapp`           |
| Logs            | Terminal + devtools           | Rotating files in the log dir   |
| Updater         | Disabled ("not set up")       | Enabled once an endpoint is set |

Because the identifiers differ, app data, localStorage, window state and the single-instance lock are all separate. Dev and release builds can run, and be installed, side by side.

## 6. Renaming the app

1. Edit `app.json` (product name, identifier, publisher, homepage, updater endpoint).
2. `npm run sync`
3. Optionally rename the npm/cargo package names (`@myapp/client`, `myapp-core`, `myapp-app`, binary `myapp`).
4. Replace `crates-tauri/app/icons/source/*.png` and run `npm run icons`.

> ⚠️ Changing the identifier after users have installed the app moves their data directory. Decide it before your first public release.
