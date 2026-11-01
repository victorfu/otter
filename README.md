# Otter

A cross-platform desktop app (Windows · macOS · Linux) built with **Tauri 2**, **React + TypeScript + Vite**, **Tailwind CSS 4**, **TanStack Router/Query** and **Jotai**. Rust business logic lives in a Tauri-free core crate, and its types are shared with the UI through **ts-rs**.

This repository is a complete skeleton for developing, packaging and releasing. The app itself is a starter page that exercises every layer.

## Quick start

```bash
npm run init     # install npm deps, pinned Rust toolchain, crates
npm run doctor   # verify the machine has everything
npm start        # launch the dev app (HMR + Rust auto-rebuild)
```

New machine? Follow [DEVELOPMENT.md](DEVELOPMENT.md#1-environment-setup) first.

## Common commands

| Command                     | Purpose                                               |
| --------------------------- | ----------------------------------------------------- |
| `npm start`                 | Dev app ("Otter Dev", separate data directory)        |
| `npm run check`             | Type-check, lint, format check, clippy                |
| `npm test`                  | Vitest + cargo test                                   |
| `npm run format`            | Format TypeScript and Rust                            |
| `npm run build`             | Release executable only → `target/release/otter.exe`  |
| `npm run bundle`            | Release installers for this OS → `release/<version>/` |
| `npm run version:set 1.2.3` | Bump the version everywhere                           |

## Docs

- [DEVELOPMENT.md](DEVELOPMENT.md): environment setup on all three platforms, daily workflow, project structure
- [RELEASING.md](RELEASING.md): versioning, local bundling, code signing, auto-update, GitHub setup

## Layout

```text
apps/client/       React UI
crates/core/       Pure Rust logic (no Tauri)
crates-tauri/app/  Tauri shell, commands, plugins, configs
scripts/           Cross-platform Node scripts
app.json           Product name / identifier (single source of truth)
```
