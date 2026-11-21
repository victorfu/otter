# Otter

Otter is a local voice transcription app for Windows, macOS and Linux. Its desktop client, native code, transcription engine and translations live in [vendor/otter](vendor/otter). The application uses the identifier `cc.otter`, accepts `otter://` links and saves new projects in `Documents/Otter`.

## Run locally

Install Node.js 24, libclang (for bindgen), the platform's Tauri and Rust prerequisites, and [Chore](https://getchore.github.io/chore/) 1.6 or later. The launcher also accepts a local Chore executable in `target/otter-tools/`. See the [platform setup instructions](vendor/otter/docs/BUILDING.md).

```console
npm run init
npm start
```

Initialization installs the locked frontend dependencies and builds the local Otter engine with pinned GGML libraries. Choose a speech model on first launch. Windows and macOS also get the matching FFmpeg binary.

| Command | Result |
| --- | --- |
| `npm start` | Start the desktop app with hot reload |
| `npm test` | Run the imported desktop frontend tests |
| `npm run check` | Compile the frontend and check the Rust desktop workspace |
| `npm run build` | Build the release executable and stage its sidecars under `vendor/otter/target/release/` |
| `npm run bundle` | Build local installers under `vendor/otter/target/release/bundle/` |

For engine development, follow [the server build guide](vendor/otter/server/docs/BUILDING.md). The earlier Otter starter remains in `apps/client`, `crates/core` and `crates-tauri/app`.

The transcription code derives from [thewh1teagle/vibe at 8de9b218](https://github.com/thewh1teagle/vibe/tree/8de9b2181c4c65f8c06e68732d5352c91ea27436) under the [MIT license](vendor/otter/LICENSE).
