# Developing Otter

Run commands from the repository root. Node and Rust versions are pinned by `.node-version` and `rust-toolchain.toml`. Install the [platform prerequisites](docs/BUILDING.md), including libclang and Chore, before running `npm run init`.

| Command | Result |
| --- | --- |
| `npm run init` | Install root tools and locked desktop dependencies, build the engine and stage the sidecars |
| `npm start` | Launch the native app with hot reload |
| `npm test` | Generate translations and run Vitest |
| `npm run check` | Build the desktop frontend and check the root Cargo workspace |
| `cargo test --locked -p otter` | Run native application tests after initialization |
| `npm run build` | Build the release application in `target/release/` |
| `npm run icons` | Regenerate application and website icons from `design/logo.png` (requires Python and Pillow) |

The root npm package supplies the pinned pnpm executable. The desktop and website packages each have their own pnpm lockfile. For frontend-only work, run `npm exec -- pnpm --dir desktop dev` after initialization. In browser development mode the client uses the bundled mock desktop runtime.

The root Cargo workspace contains `desktop/src-tauri` and `crates/meeting-detect`. The engine has its own workspace and build profile under `server/`. See the [engine build guide](server/docs/BUILDING.md) and [release guide](RELEASING.md).
