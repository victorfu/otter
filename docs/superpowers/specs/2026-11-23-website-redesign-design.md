# Website redesign: Otter for medical professionals

Date: 2026-11-23
Status: awaiting approval

## Intent

The site under `website/` is the design inherited from Vibe: its tagline ("Transcribe. on Your
Own."), black pill buttons, pastel gradient frame, a mock of an older app layout, Vibe-era
feature screenshots, Vibe's release history, and copy for a general audience. Otter is heading
into medical settings. The site should look like the Otter desktop app as it is today and speak to
medical professionals.

**What success looks like:** a clinician lands on the page, understands within the first screen
that Otter is a speech-to-text tool built for clinical work, and goes to download it.

**Audience:** medical professionals (doctors, dentists, nurses, clinic staff).

**Differentiator:** Otter can transcribe and dictate medical terminology. The site states this
through the feature that exists today: the transcription prompt, where the user lists the names,
drug names and terms they expect, and Whisper models follow those spellings.

## Goals

1. The site uses the desktop app's visual language (tokens below), so a visitor recognizes the
   app from the site.
2. A new home page for medical professionals whose one job is to send the visitor to download.
3. The site adds Traditional Chinese (zh-TW). English stays the default.
4. Download buttons lead to the GitHub repository for now.
5. Nothing on the site still reads as Vibe.

## Non-goals

- No change to the desktop app, its build, or its i18n.
- No shared theme package between app and site (approach B, rejected below).
- No removal of the existing website locales (user decision).
- No deployment work. The GitHub Pages workflow and the `website_links.py` fix are a separate
  change.
- No new medical feature in the app.

## Anti-goals (a failure even if it works)

- Anything that still reads as Vibe: its tagline, its pastel/gradient look, its screenshots, its
  release history presented as Otter's.
- Claims the product cannot support: accuracy percentages, "HIPAA compliant", "certified", named
  hospitals, or a before/after example the app does not produce.
- A download button that dead-ends (a 404 or an empty release page).

## Constraints

- Stack stays as is: React 19, Vite 7, Tailwind 4, shadcn/radix, Paraglide for i18n,
  react-router with `basename="/otter"`, Vite `base: '/otter/'`. Hosted later at
  `https://victorfu.github.io/otter/`.
- Public files other code depends on stay at their paths and keep their content:
  `public/models.json` (the app's model catalog), `public/updater/*.json` (the app's updater
  endpoint), `public/installer.sh`.
- The `/models` page reads `public/models.json`; it keeps working unchanged.
- Light and dark both follow `prefers-color-scheme`, as today (`src/main.tsx`, `index.html`).
- `chore check-i18n` (`scripts/check_i18n.py`) must pass. Missing keys in a locale are a warning
  and fall back to English; extra keys are an error.
- The repo is public; nothing sensitive goes on the site.

## Approaches considered

- **A. Restyle the existing site in place (chosen by the user).** Copy the app's tokens from
  `desktop/src/globals.css` into `website/src/globals.css`, rewrite Home, Nav and Footer, redraw
  the app mock, add zh-TW. Changes stay inside `website/`, `i18n/website/`, `i18n/changelog/`,
  plus the one `i18n/locales.json` flag.
  Trade-off: two copies of the tokens to keep in step by hand.
- **B. Extract a shared theme file used by both.** Never drifts, but touches the desktop build and
  has to separate app-only rules (transparent floating-dock and dictation-indicator windows).
  Rejected: the palette changes rarely, so the extra scope does not pay off now.

## Decided

### Visual language (from `desktop/src/globals.css`)

| Token | Light | Dark |
|---|---|---|
| background | `#f5f5f7` | `#1e1e1e` |
| card / surfaces | `#ffffff` | `#2c2c2e` |
| foreground | `#1d1d1f` | `#f3f3f5` |
| primary (buttons, links, accents) | `#0067df` | `#69aaff` |
| muted / secondary | `#ececef` | `#363638` |
| radius | `0.375rem` | |

Copy the full `:root` and `.dark` blocks, shadows and tracking from the desktop file rather than
this summary. Drop the website-only pastel gradient, the gradient "Download" pill, and the grey
radial glow on the closing band. Buttons are solid primary blue with the app's radius, not black
pills. Typography follows the app's: Inter, bold, tight tracking for large headings (as in the
app's "New transcription" heading).

### App mock on the home page

Redraw it in code (no screenshot), like today, but matching the current app idle screen: top bar
with the sidebar toggle, "Recents", the Otter glyph and wordmark, a settings gear on the right;
a Recents sidebar with dated items; a centered "New transcription" heading; the File / Record /
From link segmented control with File selected; the drop zone ("Drop audio, video or a folder
here"); and the language pill with the options button. Recents items get clinical names
(e.g. "Follow-up visit", "Patient education", "Case conference"), never real patient data.
The mock follows light/dark through tokens, as today. The mock's labels stay in English in every
locale (they depict the app UI). Reference for the current app: run `pnpm dev` in `desktop/`
(the browser build uses mocked Tauri) and open `http://localhost:1420/`.

### Home page structure

```
Nav:      [glyph] Otter     Models  Docs           [language]  [Download]
Hero:     eyebrow, headline, one-line subhead, [Download] primary, [GitHub] secondary,
          small platform line (macOS · Windows · Linux)
Mock:     the app mock above
Four:     Your terms, spelled right │ Dictate notes │ Record and transcribe │ Runs on your computer
Closing:  one line + [Download]
Footer:   glyph + one-line description, links, © Otter
```

Starting copy (the builder may polish wording; meaning and restraint must stay):

- Eyebrow: "Speech to text for clinical work" / 「為醫療工作打造的語音轉文字」
- Headline: "Tell Otter your terms. It writes them your way." /
  「先告訴 Otter 你的術語，它就照著寫。」
- Subhead: "Dictate notes or record a consultation, and Otter turns it into text on your own
  computer." / 「口述病歷、錄下會診，Otter 在你自己的電腦上轉成文字。」
- Four points:
  - Your terms, spelled right: list the drug names, procedures and names you use; transcription
    follows them. Works with Whisper models. (App: the transcription prompt, `infoPrompt` /
    `promptPlaceholder`; ignored by non-Whisper models per `promptIgnoredByModel`.)
  - Dictate notes: speak into any app with a shortcut; Otter types it. (App: dictation with a
    global shortcut.)
  - Record and transcribe: record a consultation or drop in a file; get a transcript with speaker
    labels. (App: Record, File, diarization.)
  - Runs on your computer: transcription happens on the device; audio is not uploaded.
    (Optional AI clean-up and summaries send text to the provider the user configures, see
    `docs/PRIVACY_POLICY.md`; the copy must not say "nothing ever leaves".)
- Closing band: "Free and open source." / 「免費、開源。」

### Download behaviour

Every Download button (nav, hero, closing band) links to `https://github.com/victorfu/otter`.
The platform-detecting CTA (`Cta.tsx`, `download-intent.ts`, `PostDownload.tsx`, the macOS build
picker, Linux install options) is not rendered while there is no release. Keep the files so they
can come back when the first `v*` release exists.

### Languages

- Keep all 15 existing website locales. Add `zh-TW`: `i18n/website/zh-TW.json`, the locale in
  `website/project.inlang/settings.json`, and `website: true` for zh-TW in `i18n/locales.json`
  (the desktop flag is already true).
- `en-US` stays the base locale and the default.
- Locale detection: Paraglide's built-in `preferredLanguage` matches only exact tags or the bare
  base tag, so `zh-Hant` and `zh-Hant-TW` would fall through to English. Add a small custom
  strategy: `zh-TW`, `zh-Hant`, `zh-Hant-TW` → zh-TW; `zh-HK`, `zh-MO`, `zh-Hant-HK` → zh-HK;
  `zh-CN`, `zh-Hans`, `zh-SG` → zh-CN. Everything else as today.
- The language switcher is shown in production (today it is dev-only). Use the existing
  `LanguageSelector`, with zh-TW labelled 繁體中文（台灣）.
- New and rewritten home-page strings are written in en-US and zh-TW, and translated into the
  other 14 locales too, so no locale shows a half-English page (builder's call, made here).
- Docs translations (`i18n/docs/<locale>/`) stay. zh-TW docs are not required now; that page
  falls back to English whole, as designed in `src/lib/docs.ts`.

### Features page

Hide it: remove the `/features` route and every link to it (nav, footer). Delete the eleven
Vibe-era `public/feature-*.png` images and `src/lib/features.json`. Its message keys are removed
from every locale (extra keys fail `check-i18n`, so remove them from all files together). A
medical-oriented Features page is later work.

### Changelog

Start over at Otter 0.1.0. Delete the 85 Vibe release notes in `i18n/changelog/*.md` and every
translation under `i18n/changelog/<locale>/`. Add `i18n/changelog/0.1.0.md` (and a zh-TW
translation) dated 2026-11-23: "First release of Otter", listing in a few lines what the app does
today (transcribe files and recordings, dictation, speaker labels, local models). Keep the
frontmatter format `src/lib/changelog.ts` parses. `/changelog` and `/changelog/:version` keep
working; the Beta marking against `updater/stable.json` (version 0.1.0) keeps working.

### Share image

`public/og.png` (the og:image link preview) and `public/preview.png` show the older app layout.
Replace both with a 1200×627 render of the new home page hero and app mock in light mode,
captured from the built site with headless Chrome. Not a screenshot of the real app: the page and
its share card should match. Update `index.html` title, description and og/twitter text to the new
positioning, in English.

## Left to the builder

- Component structure and file layout.
- Exact spacing, sizes and responsive breakpoints, within the app's visual language.
- Icons for the four points (lucide, as today).
- Translation wording in the 14 other locales.
- Removing now-unused message keys (highlight-*, support/Ko-fi strings no page renders), as long as
  they are removed from all locales together.
