import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { m } from '~/paraglide/messages.js'
import Layout, { SIDEBAR_STORAGE_KEY, TOGGLE_SIDEBAR_EVENT } from '~/components/layout'
import IdleHero from './components/idle-hero'
import PlayerBar from './components/player-bar'
import RecentsSidebar from './components/recents-sidebar'
import SessionView from './components/session-view'
import { SessionProvider, useSession } from './session'

function readSidebar(key: string, fallback: boolean) {
	try {
		const value = window.localStorage.getItem(key)
		return value ? value === 'expanded' : fallback
	} catch {
		return fallback
	}
}

function useSidebarVisible(idle: boolean) {
	const homeKey = 'otter_home_recents'
	const [home, setHome] = useState(() => readSidebar(homeKey, true))
	const [session, setSession] = useState(() => readSidebar(SIDEBAR_STORAGE_KEY, false))
	const [narrow, setNarrow] = useState(() => window.matchMedia('(max-width: 720px)').matches)
	const [drawer, setDrawer] = useState(false)
	const visible = narrow ? drawer : idle ? home : session

	useEffect(() => {
		const media = window.matchMedia('(max-width: 720px)')
		function resize() {
			setNarrow(media.matches)
			setDrawer(false)
		}
		media.addEventListener('change', resize)
		return () => media.removeEventListener('change', resize)
	}, [])

	useEffect(() => {
		if (!drawer || !narrow) return
		function dismiss(event: KeyboardEvent) {
			if (event.key === 'Escape' && !event.defaultPrevented && !document.querySelector('[role="dialog"], [role="menu"]')) {
				setDrawer(false)
				document.querySelector<HTMLButtonElement>('.studio-header button[aria-expanded]')?.focus()
			}
		}
		function dismissOutside(event: PointerEvent) {
			const target = event.target
			if (target instanceof Element && !target.closest('.studio-session-sidebar, .studio-header, [data-radix-popper-content-wrapper], [role="dialog"]')) setDrawer(false)
		}
		window.addEventListener('keydown', dismiss)
		document.addEventListener('pointerdown', dismissOutside)
		return () => {
			window.removeEventListener('keydown', dismiss)
			document.removeEventListener('pointerdown', dismissOutside)
		}
	}, [drawer, narrow])

	useEffect(() => setDrawer(false), [idle])

	useEffect(() => {
		function toggle() {
			if (narrow) {
				setDrawer(value => !value)
				return
			}
			if (idle) setHome(!visible)
			else setSession(!visible)
			try {
				window.localStorage.setItem(idle ? homeKey : SIDEBAR_STORAGE_KEY, visible ? 'collapsed' : 'expanded')
			} catch {
				/* The preference still applies to this window. */
			}
		}
		window.addEventListener(TOGGLE_SIDEBAR_EVENT, toggle)
		return () => window.removeEventListener(TOGGLE_SIDEBAR_EVENT, toggle)
	}, [idle, narrow, visible])
	return visible
}

function MainContent() {
	const { mode, dragging } = useSession()

	return (
		<div className="relative flex h-full min-h-0 w-full min-w-0 flex-col">
			<AnimatePresence mode="wait" initial={false}>
				{mode === 'idle' ? (
					<motion.div
						key="idle"
						exit={{ opacity: 0, y: -8 }}
						transition={{ duration: 0.15, ease: 'easeOut' }}
						className="flex min-h-0 flex-1 flex-col">
						<div className="studio-home"><IdleHero /></div>
					</motion.div>
				) : (
					<motion.div
						key="session"
						exit={{ opacity: 0, y: -8 }}
						transition={{ duration: 0.15, ease: 'easeOut' }}
						className="flex min-h-0 flex-1 flex-col">
						<SessionView />
					</motion.div>
				)}
			</AnimatePresence>

			{/* Dropping onto a running session appends to the queue — say so. */}
			<AnimatePresence>
				{dragging && mode !== 'idle' && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.15, ease: 'easeOut' }}
						className="pointer-events-none absolute inset-3 rounded-[1.25rem] border-2 border-dashed border-ring/40 bg-background/60 backdrop-blur-[2px]">
						<div className="flex h-full items-center justify-center">
							<p className="text-sm font-medium text-muted-foreground">{m.dropToAddToQueue()}</p>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	)
}

/**
 * Sidebar visibility: user toggle everywhere; entering a multi-file (batch) session
 * closes it ONCE (its own file rail takes the space) but the toggle still reopens it.
 */
function useShowSidebar() {
	const { mode, queue } = useSession()
	const sidebarVisible = useSidebarVisible(mode === 'idle')
	const batch = queue.jobs.length > 1
	const wasBatch = useRef(batch)
	const visibleRef = useRef(sidebarVisible)
	visibleRef.current = sidebarVisible

	useEffect(() => {
		if (batch && !wasBatch.current && visibleRef.current) {
			window.dispatchEvent(new CustomEvent(TOGGLE_SIDEBAR_EVENT))
		}
		wasBatch.current = batch
	}, [batch])

	return sidebarVisible
}

/** Full-width bottom player, ElevenLabs style: spans the whole window under sidebar and content. */
function PlayerSlot() {
	const { queue } = useSession()
	const selected = queue.selectedJob
	// The source media exists as soon as a job does — listening while it transcribes is fine.
	if (!selected) return null
	return <PlayerBar key={selected.id} job={selected} />
}

function Shell() {
	const { mode, queue, browse, startNew, collectingFolder, recording, link } = useSession()
	const showSidebar = useShowSidebar()

	return (
		<Layout
			projectName={queue.selectedJob?.name}
			canSearch={Boolean(queue.selectedJob?.segments.length)}
			onNew={startNew}
			onBrowse={browse}
			canBrowse={!collectingFolder && !recording.isRecording && !link.downloadingAudio}
			sidebarExpanded={showSidebar}
			bottomBar={<PlayerSlot />}
			sidebar={
				<AnimatePresence initial={false}>
					{showSidebar && (
						<motion.div
							key="recents"
							initial={{ opacity: 0, width: 0 }}
							animate={{ opacity: 1, width: 'auto' }}
							exit={{ opacity: 0, width: 0 }}
							transition={{ duration: 0.2, ease: 'easeOut' }}
							className="studio-session-sidebar flex min-h-0 overflow-hidden bg-card">
							<RecentsSidebar directory={mode === 'idle'} />
						</motion.div>
					)}
				</AnimatePresence>
			}>
			<MainContent />
		</Layout>
	)
}

export default function MainPage() {
	return (
		<SessionProvider>
			<Shell />
		</SessionProvider>
	)
}
