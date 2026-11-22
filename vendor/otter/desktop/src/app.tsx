import { invoke } from '@tauri-apps/api/core'
import { platform } from '@tauri-apps/plugin-os'
import { isNativeDesktop } from '~/lib/desktop-menu'
import { mountPopoverMaterial } from '~/lib/popover-material'
import { useEffect } from 'react'
import { getTextDirection } from '~/paraglide/runtime.js'
import { useTray } from '~/lib/tray'
import { Route, Routes } from 'react-router-dom'
import UpdateProgress from '~/components/updater-progress'
import '~/globals.css'
import SetupPage from '~/pages/setup/page'
import MainPage from '~/pages/main/page'
import { ErrorModalProvider } from './providers/error-modal'
import { UpdaterProvider } from './providers/updater'
import { PreferenceProvider } from './providers/preference'
import { usePreferenceProvider } from './providers/preference'
import { ErrorBoundary } from 'react-error-boundary'
import { BoundaryFallback } from './components/boundary-fallback'
import ErrorModalWithContext from './components/error-modal-with-context'
import { FilesProvider } from './providers/files-provider'
import { HotkeyProvider } from './providers/hotkey'
import { RecordingShortcutProvider } from './providers/recording-shortcut'
import { ToastProvider } from './providers/toast'
import { Toaster } from '~/components/ui/sonner'
import { TooltipProvider } from '~/components/ui/tooltip'
import { DirectionProvider } from '~/components/ui/direction'
import { setMeetingDetectionEnabled } from '~/lib/meeting-prompt'

export default function App() {
	return (
		<PreferenceProvider>
			<AppContent />
		</PreferenceProvider>
	)
}

function AppContent() {
	const { displayLanguage, closeToTray, meetingDetectionEnabled } = usePreferenceProvider()
	const dir = getTextDirection(displayLanguage)
	useTray(closeToTray, displayLanguage)

	useEffect(() => {
		const root = document.documentElement
		const os = platform()
		root.dataset.platform = os
		if (!isNativeDesktop()) return
		let mounted = true
		let dispose: (() => void) | undefined
		void invoke<{ material: boolean; overlay: boolean }>('window_chrome').then(chrome => {
			if (!mounted) return
			if (os === 'windows' && chrome.overlay) root.dataset.frame = 'dwm'
			root.classList.toggle('native-material', chrome.material)
			if (chrome.material) dispose = mountPopoverMaterial()
		}).catch(error => console.warn('Window appearance unavailable', error))
		return () => {
			mounted = false
			dispose?.()
			root.classList.remove('native-material')
			delete root.dataset.frame
		}
	}, [])

	useEffect(() => {
		document.body.dir = dir
	}, [dir])

	useEffect(() => {
		setMeetingDetectionEnabled(meetingDetectionEnabled).catch((error) => console.error('Failed to sync meeting detection:', error))
	}, [meetingDetectionEnabled])

	return (
		<DirectionProvider dir={dir}>
			<ErrorBoundary FallbackComponent={BoundaryFallback}>
				<ErrorModalProvider>
					<UpdaterProvider>
						<TooltipProvider>
							<ToastProvider>
								<HotkeyProvider>
									<RecordingShortcutProvider>
										<ErrorModalWithContext />
										<UpdateProgress />
										<FilesProvider>
											<Routes>
												<Route path="/" element={<MainPage />} />
												<Route path="/setup" element={<SetupPage />} />
											</Routes>
										</FilesProvider>
										<Toaster position="bottom-right" />
									</RecordingShortcutProvider>
								</HotkeyProvider>
							</ToastProvider>
						</TooltipProvider>
					</UpdaterProvider>
				</ErrorModalProvider>
			</ErrorBoundary>
		</DirectionProvider>
	)
}
