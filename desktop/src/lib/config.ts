export const aboutURL = 'https://victorfu.github.io/otter/'
export const repoURL = 'https://github.com/victorfu/otter'
export const updateVersionURL = 'https://github.com/victorfu/otter/releases/latest'
export const modelsPageURL = 'https://victorfu.github.io/otter/models'
/** The model catalog, published with the website so models added later reach installed apps. */
export const modelCatalogURL = 'https://victorfu.github.io/otter/models.json'
/**
 * Release notes. With a version it opens that release, otherwise the whole list —
 * the page falls back to English for a release this locale has not translated.
 */
export const changelogURL = (version?: string) => `https://victorfu.github.io/otter/changelog${version ? `/${version}` : ''}`
export const discordURL = 'https://discord.gg/EcxWSstQN8'
export const supportOtterURL = 'https://victorfu.github.io/otter/?action=support-otter'
export const storeFilename = 'app_config.json'

/** What the catalog knows about a finished download, beyond the bytes themselves. */
export interface ModelIntegrity {
	/** Exact size in bytes of the published artifact. */
	size?: number
	/** Lowercase hex SHA-256 of the published artifact. */
	sha256?: string
}

/** One downloadable model. Catalog entries (`website/public/models.json`) carry integrity metadata;
 * a URL the user pastes into settings, or an unverified `otter://download/?url=` link, does not and
 * falls back to the size and magic-byte checks the backend runs on every download. */
export interface ModelDownload extends ModelIntegrity {
	url: string
}

/** ONNX diarization files from before the Nemotron model. Nothing downloads or reads them any more;
 * they are named only so a copy left in the models folder is never listed as a model. */
export const embeddingModelFilename = 'wespeaker_en_voxceleb_CAM++.onnx'
export const segmentModelFilename = 'segmentation-3.0.onnx'

/**
 * The download address, size and hash of this file and of `vadModelFilename` live in the `helperModels`
 * section of the model catalog; a test keeps the filenames here equal to the catalog's.
 *
 * Diarization runs NVIDIA Nemotron-3-Diarization (up to 8 speakers) on ggml, a GGUF exported from
 * the HF safetensors by `server/crates/nemotron-diarize-rs/scripts/export.py --dtype q8_0`.
 * Q8_0 matches F32 segments on our checks at a quarter of the size.
 *
 * Published to the vibe-app Hugging Face org from `nvidia/Nemotron-3-Diarization` (OpenMDW 1.1), and
 * served from this repository's `models-r1` release, an unchanged copy (`chore upload-models`).
 *
 * Anyone upgrading has speaker recognition on with this file missing: the transcription queue
 * runs the same download gate as the switch before the run. The models they had before stay
 * untouched — see `legacyDiarizeModelFilenames`.
 */
export const diarizeModelFilename = 'nemotron-3-diarization-Q8_0.gguf'
/**
 * Diarization models earlier releases downloaded. Nothing reads them; they are listed only so the
 * Sortformer GGUF never shows up as a transcription model. The older 492 MB `.onnx` needs no entry:
 * it is not a `.gguf`/`.bin`, so the model listing never sees it. Deleting them is left to users.
 */
export const legacyDiarizeModelFilenames = ['diar_streaming_sortformer_4spk-v2.q8_0.gguf']
export const vadModelFilename = 'ggml-silero-v6.2.0.bin'

export const llmApiKeyUrl = 'https://console.anthropic.com/settings/keys'
export const llmDefaultMaxTokens = 8192 // https://docs.anthropic.com/en/docs/about-claude/models
export const llmLimitsUrl = 'https://console.anthropic.com/settings/limits'
export const llmCostUrl = 'https://console.anthropic.com/settings/cost'

export const ytDlpAssetNames: Record<string, string> = {
	'windows-x86_64': 'yt-dlp.exe',
	'windows-aarch64': 'yt-dlp_arm64.exe',
	'linux-x86_64': 'yt-dlp_linux',
	'linux-aarch64': 'yt-dlp_linux_aarch64',
	'macos-x86_64': 'yt-dlp_macos',
	'macos-aarch64': 'yt-dlp_macos',
}

export const videoExtensions = ['mp4', 'mkv', 'avi', 'mov', 'wmv', 'webm', 'mxf']
export const audioExtensions = ['mp3', 'wav', 'aac', 'flac', 'oga', 'ogg', 'opic', 'opus', 'm4a', 'm4b', 'wma']
export const themes = ['light', 'dark']
export const defaultAutoSummarizeOnFinish = false

/**
 * Default dictation shortcut: Option+Space on macOS, Ctrl+Space elsewhere. Resolved on call rather
 * than at module scope: reading the platform at import time makes this file unimportable outside a
 * webview (and untestable).
 */
export function getDefaultHotkeyShortcut() {
	const isMac = navigator.platform.toUpperCase().includes('MAC')
	return isMac ? 'Alt+Space' : 'Ctrl+Space'
}

/** Global recording uses one portable accelerator on every desktop platform. */
export function getDefaultRecordingShortcut() {
	return 'CmdOrCtrl+Shift+R'
}
