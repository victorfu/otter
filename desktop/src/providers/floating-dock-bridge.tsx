import { emit, listen } from '@tauri-apps/api/event'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { openSettingsSection } from '~/lib/app'
import { DOCK_ACTION_EVENT, DOCK_READY_EVENT, DOCK_STATUS_EVENT, setFloatingDockEnabled, type DockAction, type DockStatus } from '~/lib/floating-dock'
import { useHotkeyProvider } from './hotkey'
import { useRecordingShortcut } from './recording-shortcut'

/** What the main page offers the dock while it is mounted. */
export interface DockSessionHandlers {
	transcribePaths: (paths: string[]) => void
	browse: () => void | Promise<void>
}

export interface DockBridgeDeps {
	status: DockStatus
	toggleRecording: () => Promise<void>
	toggleDictation: () => Promise<void>
	showMain: () => Promise<void>
	openSettings: () => void
	setDockEnabled: (enabled: boolean) => Promise<void>
}

/**
 * Runs what the floating dock asks for in the main window and tells it what is running. Recording
 * and dictation work with the main window hidden; anything that needs the main window shows it.
 */
export function useDockBridge(deps: DockBridgeDeps) {
	const depsRef = useRef(deps)
	const sessionRef = useRef<DockSessionHandlers | null>(null)

	useEffect(() => {
		depsRef.current = deps
	}, [deps])

	const register = useCallback((handlers: DockSessionHandlers) => {
		sessionRef.current = handlers
		return () => {
			if (sessionRef.current === handlers) sessionRef.current = null
		}
	}, [])

	useEffect(() => {
		const unlisten = listen<DockAction>(DOCK_ACTION_EVENT, async ({ payload }) => {
			const current = depsRef.current
			try {
				switch (payload.type) {
					case 'toggle-recording':
						return await current.toggleRecording()
					case 'toggle-dictation':
						return await current.toggleDictation()
					case 'hide-dock':
						return await current.setDockEnabled(false)
					case 'open-main':
						return await current.showMain()
					case 'open-settings':
						await current.showMain()
						return current.openSettings()
					case 'browse':
					case 'transcribe-paths': {
						await current.showMain()
						const session = sessionRef.current
						if (!session) return console.warn(`floating dock: no main page to handle ${payload.type}`)
						if (payload.type === 'browse') return await session.browse()
						return session.transcribePaths(payload.paths)
					}
				}
			} catch (error) {
				console.error(`floating dock action ${payload.type} failed:`, error)
			}
		})
		return () => {
			unlisten.then((dispose) => dispose())
		}
	}, [])

	const { recording, dictating, dictationEnabled } = deps.status
	useEffect(() => {
		void emit(DOCK_STATUS_EVENT, { recording, dictating, dictationEnabled } satisfies DockStatus)
	}, [recording, dictating, dictationEnabled])

	useEffect(() => {
		const unlisten = listen(DOCK_READY_EVENT, () => {
			void emit(DOCK_STATUS_EVENT, depsRef.current.status)
		})
		return () => {
			unlisten.then((dispose) => dispose())
		}
	}, [])

	return { register }
}

const DockSessionContext = createContext<((handlers: DockSessionHandlers) => () => void) | null>(null)

async function showMainWindow() {
	const window = getCurrentWindow()
	await window.unminimize()
	await window.show()
	await window.setFocus()
}

export function FloatingDockBridge({ children }: { children: ReactNode }) {
	const dictation = useHotkeyProvider()
	const recording = useRecordingShortcut()
	const status = useMemo<DockStatus>(
		() => ({ recording: recording.isRecording, dictating: dictation.isHotkeyRecording, dictationEnabled: dictation.hotkeyEnabled }),
		[recording.isRecording, dictation.isHotkeyRecording, dictation.hotkeyEnabled],
	)
	const deps = useMemo<DockBridgeDeps>(
		() => ({
			status,
			toggleRecording: recording.toggleRecording,
			toggleDictation: dictation.toggleDictation,
			showMain: showMainWindow,
			openSettings: () => openSettingsSection('general'),
			setDockEnabled: setFloatingDockEnabled,
		}),
		[status, recording.toggleRecording, dictation.toggleDictation],
	)
	const { register } = useDockBridge(deps)
	return <DockSessionContext.Provider value={register}>{children}</DockSessionContext.Provider>
}

/** The main page hands the dock its drop and browse handlers while it is mounted. */
export function useRegisterDockSession(handlers: DockSessionHandlers) {
	const register = useContext(DockSessionContext)
	const { transcribePaths, browse } = handlers
	useEffect(() => register?.({ transcribePaths, browse }), [register, transcribePaths, browse])
}
