<p align="center">
  <img src="design/logo.png" alt="Otter logo" width="128">
</p>

<h1 align="center">Otter</h1>

<p align="center"><b>Record, transcribe, edit and export audio and video — with speech recognition that runs
entirely on your computer.</b></p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-2e7d32" alt="License: MIT"></a>
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-4c7fb0" alt="Platform: Windows | macOS | Linux">
  <img src="https://img.shields.io/badge/Tauri-2-24c8db" alt="Tauri 2">
  <img src="https://img.shields.io/badge/Rust-engine-dea584" alt="Rust engine">
</p>

---

## 🚀 What is Otter?

Otter is a local-first desktop workspace for turning speech into text. It records from your
microphone, imports audio and video, transcribes with a bundled native engine, and lets you edit and
export the result — no account, no upload, no usage telemetry. Once a speech model is downloaded,
transcription works offline.

Under the hood, `otter-server` — a Rust engine built on ggml — loads the model, streams results and
separates speakers, behind an OpenAI-compatible HTTP API that only your own machine can reach. Projects
are saved as plain files in `Documents/Otter` by default, so your work is never locked in.

## ✨ Highlights

- 🔒 **Private by design** — recordings and transcripts stay on your device. The desktop app sends no
  usage statistics; the only network traffic is model downloads, update checks and the optional
  features you switch on.
- ⚡ **GPU-accelerated engine** — Metal and CoreML on macOS, Vulkan on Windows and Linux, with an
  automatic CPU fallback when a model does not fit in GPU memory.
- 🎙️ **Capture anything** — record live, import existing audio or video files, and dictate into any
  app from a floating dock that is always one click away.
- 📞 **Meeting detection** — a cross-platform detector notices when a video call starts using your
  microphone and offers to start recording.
- 🗣️ **Speaker separation** — in-process diarization labels who said what, with nothing sent to a
  cloud service.
- ✍️ **Edit, then export** — clean up the transcript in the app, then export to TXT, Markdown, SRT,
  VTT, CSV, JSON, DOCX or PDF.
- 🤖 **Optional AI summaries** — off by default. Bring your own Claude, an OpenAI-compatible server, or
  a local Ollama, and only the transcript text is ever sent — never the recording.
- 🌍 **Speaks your language** — the interface ships in 23 locales, from English and Traditional
  Chinese to Japanese, Korean, German, French and Hindi.
- 🔄 **Signed auto-updates** — new versions arrive straight from GitHub Releases, with no other
  servers involved.

## 🎯 Who is it for?

- People who transcribe meetings, interviews, lectures or podcasts and do not want to upload them.
- Teams and professionals whose recordings are confidential and must never reach a cloud service.
- Developers who want a fast, local, OpenAI-compatible speech-to-text endpoint to build against.

## 💻 Under the hood

| Layer | Implementation |
| --- | --- |
| Desktop shell | Tauri 2 with a Rust backend |
| Interface | React and TypeScript |
| ASR engine | `otter-server`, a standalone Rust process on ggml (`whisper-rs`, `parakeet-rs`, `nemotron-rs`) |
| Voice activity & speakers | `vad-rs` and in-process Nemotron diarization |
| Acceleration | Metal / CoreML on macOS; Vulkan on Windows and Linux |
| Media | A pinned FFmpeg helper bundled on Windows and macOS |
| Packaging | NSIS installer on Windows, DMG on macOS, `.deb` on Linux |

The engine lives in [`server/`](server/) and also runs on its own — see its
[README](server/README.md) if you want the transcription API without the desktop app.

## 🛠 For developers

Install Node.js 24, Rust, libclang, Chore 1.6 or later, and the native dependencies for your platform
(see the [build guide](docs/BUILDING.md)). Then:

```sh
npm run init   # install dependencies, build the engine, stage the sidecars
npm start      # launch the app in development mode
```

Choose a speech model on first launch.

| Command | What it does |
| --- | --- |
| `npm test` | Run the desktop test suite |
| `npm run check` | Run the frontend and native checks |
| `npm run build` | Produce a release executable |
| `npm run doctor` | Diagnose a broken development environment |

### Project layout

| Directory | Contents |
| --- | --- |
| [desktop](desktop/) | React interface and Tauri native application |
| [server](server/) | Local transcription engine and its Rust workspace |
| [crates](crates/) | Shared native components, including meeting detection |
| [i18n](i18n/) | Translations for the application, website and documentation |
| [website](website/) | Product website |
| [design](design/) | Product artwork and application icon source |

## 📖 Documentation

- **Developers** — start at [Development](DEVELOPMENT.md) and the
  [architecture overview](docs/ARCHITECTURE.md); see also [building](docs/BUILDING.md),
  [debugging](docs/DEBUG.md), [end-to-end tests](docs/E2E.md), [updater](docs/UPDATER.md) and
  [Releasing](RELEASING.md).
- **Privacy** — the full [privacy policy](docs/PRIVACY_POLICY.md)
  ([繁體中文](docs/PRIVACY_POLICY.zh-Hant.md)) spells out exactly what stays local and what each
  optional feature sends.
- **Translations** — see [TRANSLATIONS.md](docs/TRANSLATIONS.md) to add or improve a language.

## 📄 License

Otter is [MIT licensed](LICENSE). Third-party components and their licenses are listed in
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
