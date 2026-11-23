import { emit, listen } from '@tauri-apps/api/event'
import { useEffect, useLayoutEffect, useState } from 'react'
import { CONFIG_KEYS } from '~/lib/config-keys'
import { readConfig } from '~/lib/config-store'
import { DOCK_READY_EVENT, DOCK_STATUS_EVENT, requestUntilAnswered, type DockStatus } from '~/lib/floating-dock'
import { supportedLanguages } from '~/lib/i18n'
import { m } from '~/paraglide/messages.js'
import { getLocale, getTextDirection, setLocale } from '~/paraglide/runtime.js'

/**
 * Transparent margin (logical pixels) around the menu so its shadow is not clipped into a square.
 * Must match `PAD` in `floating_dock.rs`. The ball's window has none: it is exactly the ball.
 */
export const PAD = 12

/** Language, theme and a transparent page for either dock window. */
export function useDockWindowSetup() {
	const configuredLocale = readConfig(CONFIG_KEYS.displayLanguage, 'en-US')
	if (supportedLanguages[configuredLocale] && configuredLocale !== getLocale()) {
		setLocale(configuredLocale as never, { reload: false })
	}
	const theme = readConfig<'light' | 'dark'>(CONFIG_KEYS.theme, window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
	const direction = getTextDirection(configuredLocale)

	useLayoutEffect(() => {
		document.title = m.appTitle()
		document.body.dir = direction
		document.documentElement.classList.toggle('dark', theme === 'dark')
		// Also set in main.tsx before the first paint. Never removed: one opaque frame would stay
		// behind the ball on Linux (see main.tsx).
		document.documentElement.classList.add('floating-dock-window')
	}, [direction, theme])
}

/** What is running in the main window, asked for until the main window answers. */
export function useDockStatus() {
	const [status, setStatus] = useState<DockStatus>({ recording: false, dictating: false, dictationEnabled: false })

	useEffect(() => {
		let request: ReturnType<typeof requestUntilAnswered> | null = null
		const unlisten = listen<DockStatus>(DOCK_STATUS_EVENT, ({ payload }) => {
			request?.answered()
			setStatus(payload)
		})
		// Ask only once the listener is in place, and keep asking until the main window answers.
		void unlisten.then(() => {
			request = requestUntilAnswered(() => void emit(DOCK_READY_EVENT))
		})
		return () => {
			request?.stop()
			unlisten.then((dispose) => dispose())
		}
	}, [])

	return status
}
