# Otter Architecture

## Overview

Otter is a desktop transcription app built with **Tauri** (Rust + TypeScript frontend).

## Components

### Desktop App (`desktop/`)

- **Frontend**: TypeScript + React (UI)
- **Backend**: Rust/Tauri (`desktop/src-tauri/`)
- Handles UI, file management, and settings
- Spawns and communicates with the server via local HTTP

### Server (`server/`)

- **Language**: Rust on ggml (`whisper-rs`, `parakeet-rs`, `nemotron-rs`, `vad-rs`, `nemotron-diarize-rs`)
- **Location**: `server/` in this repository, its own Cargo workspace; crate and binary `otter-server`
- **Purpose**: single local process for audio transcription, model loading, streaming, and diarization, behind an OpenAI-compatible HTTP API
- Bundled as the `otter-server` sidecar with the desktop app
- Diarization is in-process via `nemotron-diarize-rs` (Nemotron-3-Diarization GGUF from its `scripts/export.py`); Otter does not bundle or spawn a separate binary
- **Build**: The root `chore setup` task builds the engine from `server/` against the ggml libraries pinned in `server/libs/`.
- **Distribution**: The desktop installer includes the resulting engine executable.

### FFmpeg Helper

- macOS and Windows builds also bundle `ffmpeg` from the server release archives
- Otter passes its path to the server with `OTTER_SERVER_FFMPEG_PATH`

### Build Flow

1. Otter CI runs `chore setup <target-triple>`
2. It builds `otter-server` and stages the FFmpeg version pinned by `.server-version` on Windows and macOS
3. Binaries placed in `desktop/src-tauri/binaries/`
4. Tauri bundles `otter-server` and, where configured, `ffmpeg` into the final app

## Key Point for Agents

Native runtime compatibility issues for transcription usually come from the server or its linked ggml libraries, not the Otter UI code.

To fix one, change `server/` (a ggml fix goes in `server/libs/patches/` with a revision bump), rebuild the engine with `chore setup`, and verify the desktop package.
