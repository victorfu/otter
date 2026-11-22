# Otter

Otter is a desktop application for recording, transcribing, editing and exporting audio and video. Speech recognition runs locally on Windows, macOS and Linux. Projects are saved in `Documents/Otter` by default.

## Run locally

Install Node.js 24, Rust, libclang, Chore 1.6 or later, and the native dependencies for your platform. See the [build guide](docs/BUILDING.md).

```sh
npm run init
npm start
```

Choose a speech model on first launch. Initialization installs the locked desktop dependencies, builds the local transcription engine and stages the platform sidecars.

## Project layout

| Directory | Contents |
| --- | --- |
| [desktop](desktop/) | React interface and Tauri native application |
| [server](server/) | Local transcription engine and its Rust workspace |
| [crates](crates/) | Shared native components, including meeting detection |
| [i18n](i18n/) | Translations for the application, website and documentation |
| [website](website/) | Product website |
| [design](design/) | Product artwork and application icon source |

Run `npm test` for the desktop test suite, `npm run check` for the frontend and native checks, and `npm run build` for a release executable. See [Development](DEVELOPMENT.md) and [Releasing](RELEASING.md) for the remaining commands.
