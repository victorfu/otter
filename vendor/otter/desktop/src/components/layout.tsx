import { PanelLeft, Settings } from 'lucide-react'
import { platform } from '@tauri-apps/plugin-os'
import { ReactNode, useContext, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { getTextDirection } from '~/paraglide/runtime.js'
import { m } from '~/paraglide/messages.js'
import { Button } from '~/components/ui/button'
import { cn } from '~/lib/style'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'
import { UpdaterContext } from '~/providers/updater'
import SettingsModal from './settings-modal'
import PageTransition from './page-transition'
import ModelDownloadPrompt from './model-download-prompt'
import UpdateBanner from './update-banner'

/**
 * The topbar lives here but the Recents sidebar belongs to the main page, so the toggle travels as
 * a window event and the collapsed state is read from localStorage by whoever renders the sidebar.
 */
export const TOGGLE_SIDEBAR_EVENT = 'otter:toggle-sidebar'
export const SIDEBAR_STORAGE_KEY = 'otter_sidebar_collapsed'

/** Start inset that clears the macOS traffic lights; identical for header and sidebar so the toggle never moves. */
export function titlebarInset(): number {
	return isMacOverlayTitlebar() ? 76 : 10
}

/** True in the real macOS app, where the titlebar is an overlay and traffic lights sit over our UI. */
export function isMacOverlayTitlebar(): boolean {
	try {
		return '__TAURI_INTERNALS__' in window && !('__otterMockTauriRuntime__' in globalThis) && platform() === 'macos'
	} catch {
		return false
	}
}

function SidebarToggleButton({ expanded }: { expanded: boolean }) {
	const { availableUpdate } = useContext(UpdaterContext)
	// While the sidebar is open its footer already carries the update button; the dot would double up.
	const hint = availableUpdate && !expanded

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					variant="ghost"
					size="sm"
					aria-expanded={expanded}
					aria-label={hint ? m.updateAvailableOpenRecents() : m.toggleRecents()}
					className="relative h-9 gap-2 rounded-md text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground [&_svg]:size-[18px]"
					onClick={() => window.dispatchEvent(new CustomEvent(TOGGLE_SIDEBAR_EVENT))}>
					<PanelLeft strokeWidth={1.75} /><span>{m.recents()}</span>
					{hint && (
						<span aria-hidden className="absolute end-1 top-1 h-2 w-2 rounded-full bg-primary ring-2 ring-background motion-safe:animate-pulse" />
					)}
				</Button>
			</TooltipTrigger>
			<TooltipContent>{hint ? m.updateAvailableOpenRecents() : m.toggleRecents()}</TooltipContent>
		</Tooltip>
	)
}

interface LayoutProps {
	sidebarExpanded?: boolean
	showRecentsToggle?: boolean
	children: ReactNode
	/** Full-height panel docked at the window's start edge (Claude-desktop style). */
	sidebar?: ReactNode
	/** Full-width bar docked at the very bottom of the window (player). */
	bottomBar?: ReactNode
}

export default function Layout({ children, sidebar, bottomBar, sidebarExpanded = false, showRecentsToggle = true }: LayoutProps) {
	const [settingsVisible, setSettingsVisible] = useState(false)
	const [settingsScrollTo, setSettingsScrollTo] = useState<string | undefined>(undefined)
	// Only the main page renders a Recents sidebar, so only it gets the toggle.
	const showSidebarToggle = useLocation().pathname === '/'

	function openSettings(scrollTo?: string) {
		setSettingsScrollTo(scrollTo)
		setSettingsVisible(true)
	}

	useEffect(() => {
		// Vibrancy: the macOS window is transparent; html/body must not paint over it.
		if (isMacOverlayTitlebar()) document.documentElement.classList.add('mac-vibrancy')
	}, [])

	useEffect(() => {
		function onOpenSettings(event: Event) {
			const scrollTo = (event as CustomEvent<{ scrollTo?: string }>).detail?.scrollTo
			openSettings(scrollTo)
		}
		window.addEventListener('otter:open-settings', onOpenSettings)
		if (window.location.hash === '#settings') {
			openSettings()
		}
		return () => window.removeEventListener('otter:open-settings', onOpenSettings)
	}, [])

	return (
		<div className="flex h-screen min-h-0 flex-col overflow-hidden">
			<header data-tauri-drag-region className="studio-header" style={{ paddingLeft: titlebarInset() }}>
				{showSidebarToggle && showRecentsToggle && <SidebarToggleButton expanded={sidebarExpanded} />}
				<span aria-hidden className="studio-mark"><i /><i /><i /><i /></span>
				<span className="studio-wordmark">{m.appTitle()}</span>
				<Button variant="ghost" size="sm" onClick={() => openSettings()} className="ms-auto gap-2">
					<Settings className="size-4" />{m.settings()}
				</Button>
			</header>
			{settingsVisible && <SettingsModal visible={settingsVisible} setVisible={setSettingsVisible} scrollTo={settingsScrollTo} />}
			<ModelDownloadPrompt />
			{/* The columns are laid out left-to-right in every locale; their contents follow the text direction. */}
			<div className="flex min-h-0 flex-1" style={{ direction: 'ltr' }}>
				{sidebar}
				<div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background" style={{ direction: getTextDirection() }}>
					
					{/* Below the drag strip, so the titlebar and traffic lights stay put; above every page's content. */}
					<UpdateBanner />
					{/*
					 * The main page owns its scrolling (transcript pane, file rail), so the shell must not
					 * scroll too — otherwise the rails drift away under the reader. Other pages scroll here.
					 * overflow-x-hidden: offscreen export copies must not turn into a sideways scroll (RTL).
					 */}
					<div className={cn('min-h-0 flex-1 overflow-x-hidden', showSidebarToggle ? 'overflow-y-hidden' : 'overflow-y-auto px-4 pb-4')}>
						<PageTransition fill={showSidebarToggle}>
							<div className="stagger-in h-full">{children}</div>
						</PageTransition>
					</div>
					{/* The player fills only the content column; the sidebar stays full height beside it. */}
					{bottomBar}
				</div>
			</div>
		</div>
	)
}
