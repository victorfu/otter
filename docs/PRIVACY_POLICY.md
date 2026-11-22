## Privacy Policy

_Last updated: 2026-11-22_

- After the model is downloaded, Otter transcribes recordings on your device, even offline.
- When an AI summary or dictation cleanup runs, Otter sends the text being processed to the AI server selected in Settings.
- Otter saves recordings and transcripts as local files without adding file encryption.

---

### 1. Offline Transcription

Otter processes audio on your device. Once the model is downloaded, transcription works without an internet connection. Model downloads, update checks and optional online features can make network requests.

---

### 2. Data Sent by Optional Features

**AI summaries and dictation cleanup.** Both features are off by default. When a summary runs, Otter sends transcript text and the task prompt to the configured AI server. When dictation cleanup runs, it sends the dictated text and cleanup prompt. These requests do not include the recording. If automatic summaries are enabled, a completed transcription can trigger a request without another click.

In **Settings → AI**, check the service and server address before enabling either feature:

- **Claude** sends requests to Anthropic at `https://api.anthropic.com`.
- **OpenAI-compatible services** use the configured server, defaulting to `https://api.openai.com/v1`. A custom server may be operated by another provider.
- **Ollama** defaults to `http://localhost:11434` on your computer. If you enter a remote server address, Otter sends the text to that server.

The receiving service controls how it processes and retains the text. This includes any names or medical details present in the text.

The desktop app does not send usage statistics.

---

### 3. Automatic Updates

**Otter** supports automatic updates, which come directly from GitHub releases. No other cloud storage or external servers are involved.

---

### 4. Third-Party Services

**Otter** integrates prebuilt ffmpeg from [wang-bin/avbuild](https://github.com/wang-bin/avbuild) and uses Tauri for building the app. None of these services collect or transmit user data.

---

### 5. Data Storage and Security

Otter does not add file encryption when saving recordings or transcripts. Users have complete control over where and when transcription files are saved on their own computers. You are in full control of your transcription files and can delete them at any time.

---

### 6. External Links

**Otter** may include links to external websites, such as:

- [GitHub](https://github.com/victorfu/otter)

These websites may collect personal data according to their respective privacy policies. Please review those policies before interacting with external sites.

---

### 7. Open Source

**Otter** is an open-source application, and the source code is available at [github.com/victorfu/otter](https://github.com/victorfu/otter).

---

### 8. Changes to Privacy Policy

We may update this Privacy Policy as needed. Any changes will be communicated through app updates or on GitHub. Please check for updates regularly to stay informed of any changes.

---

### 9. Contact Us

If you have any questions or concerns about this Privacy Policy, please reach out via [GitHub Issues](https://github.com/victorfu/otter/issues).
