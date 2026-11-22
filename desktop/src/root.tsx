import { BrowserRouter } from 'react-router-dom'
import App from './app'
import DictationIndicatorWindow from './windows/dictation-indicator-window'
import MeetingPromptWindow from './windows/meeting-prompt-window'
import FloatingDockWindow from './windows/floating-dock-window'
import FloatingDockMenuWindow from './windows/floating-dock-menu-window'

export default function Root() {
	const windowName = new URLSearchParams(window.location.search).get('window')

	if (windowName === 'dictation-indicator') return <DictationIndicatorWindow />
	if (windowName === 'meeting-prompt') return <MeetingPromptWindow />
	if (windowName === 'floating-dock') return <FloatingDockWindow />
	if (windowName === 'floating-dock-menu') return <FloatingDockMenuWindow />

	return (
		<BrowserRouter>
			<App />
		</BrowserRouter>
	)
}
