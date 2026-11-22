import { emit, listen } from '@tauri-apps/api/event'
import { platform } from '@tauri-apps/plugin-os'
import { AppWindow, AudioLines, EyeOff, FileAudio, Mic, Settings, Square, type LucideIcon } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { CONFIG_KEYS } from '~/lib/config-keys'
import { readConfig } from '~/lib/config-store'
import { getDefaultHotkeyShortcut, getDefaultRecordingShortcut } from '~/lib/config'
import {
	createHoverCloser,
	DOCK_ACTION_EVENT,
	DOCK_BALL_HOVER_EVENT,
	DOCK_MENU_VISIBLE_EVENT,
	dockMenuItems,
	floatingDockMenuReady,
	formatShortcut,
	hideFloatingDockMenu,
	type DockAction,
	type DockMenuId,
} from '~/lib/floating-dock'
import { cn } from '~/lib/style'
import { m } from '~/paraglide/messages.js'
import { PAD, useDockStatus, useDockWindowSetup } from './floating-dock-shared'

/** How long the pointer may be outside both the ball and the menu before the menu closes. */
const LEAVE_CLOSE_MS = 700

const icons: Record<DockMenuId, { idle: LucideIcon; active?: LucideIcon }> = {
	recording: { idle: Mic, active: Square },
	dictation: { idle: AudioLines, active: Square },
	browse: { idle: FileAudio },
	'open-main': { idle: AppWindow },
	settings: { idle: Settings },
	'hide-dock': { idle: EyeOff },
}

function label(id: DockMenuId, active: boolean) {
	switch (id) {
		case 'recording':
			return active ? m.floatingDockStopRecording() : m.floatingDockStartRecording()
		case 'dictation':
			return active ? m.floatingDockStopDictation() : m.floatingDockStartDictation()
		case 'browse':
			return m.floatingDockBrowse()
		case 'open-main':
			return m.floatingDockOpenMain()
		case 'settings':
			return m.floatingDockSettings()
		case 'hide-dock':
			return m.floatingDockHide()
	}
}

function readShortcuts() {
	return {
		recording: readConfig(CONFIG_KEYS.recordingShortcutEnabled, false)
			? readConfig(CONFIG_KEYS.recordingShortcut, getDefaultRecordingShortcut())
			: null,
		dictation: readConfig(CONFIG_KEYS.hotkeyEnabled, false) ? readConfig(CONFIG_KEYS.hotkeyShortcut, getDefaultHotkeyShortcut()) : null,
	}
}

/** The ball's menu, in its own window that Rust keeps hidden and places beside the ball. */
export default function FloatingDockMenuWindow() {
	useDockWindowSetup()
	const status = useDockStatus()
	const isMac = platform() === 'macos'
	const [shortcuts, setShortcuts] = useState(readShortcuts)
	const menuRef = useRef<HTMLDivElement>(null)
	const closerRef = useRef<ReturnType<typeof createHoverCloser> | null>(null)

	// Tell Rust how tall the menu is so its window fits it exactly. The height only changes with
	// the language, which reloads this window.
	useLayoutEffect(() => {
		const height = menuRef.current?.offsetHeight
		if (height) void floatingDockMenuReady(height).catch((error) => console.error('Could not size the dock menu:', error))
	}, [])

	useEffect(() => {
		const closer = createHoverCloser(() => void hideFloatingDockMenu().catch(() => undefined), LEAVE_CLOSE_MS)
		closerRef.current = closer
		const unlistenVisible = listen<boolean>(DOCK_MENU_VISIBLE_EVENT, ({ payload }) => {
			if (payload) {
				setShortcuts(readShortcuts())
				closer.reset()
			} else {
				closer.dispose()
			}
		})
		const unlistenBall = listen<boolean>(DOCK_BALL_HOVER_EVENT, ({ payload }) => closer.set('ball', payload))
		return () => {
			closer.dispose()
			unlistenVisible.then((dispose) => dispose())
			unlistenBall.then((dispose) => dispose())
		}
	}, [])

	async function run(action: DockAction) {
		await hideFloatingDockMenu().catch((error) => console.error('Could not close the dock menu:', error))
		await emit(DOCK_ACTION_EVENT, action)
	}

	return (
		// The transparent padding leaves room for the shadow; without it the shadow is clipped to a square.
		<div
			className="h-screen w-screen select-none"
			style={{ padding: PAD }}
			onPointerEnter={() => closerRef.current?.set('menu', true)}
			onPointerLeave={() => closerRef.current?.set('menu', false)}>
			<div
				ref={menuRef}
				role="menu"
				className="rounded-2xl border border-border/60 bg-card p-1.5 text-card-foreground shadow-[0_4px_18px_rgba(0,0,0,0.22)]">
				{dockMenuItems(status, shortcuts).map((item) => {
					const Icon = (item.active && icons[item.id].active) || icons[item.id].idle
					return (
						<button
							key={item.id}
							type="button"
							role="menuitem"
							disabled={item.disabled}
							onClick={() => void run(item.action)}
							className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-start text-sm transition-colors hover:bg-accent/60 disabled:pointer-events-none disabled:opacity-45">
							<Icon className={cn('h-4 w-4 shrink-0', item.active ? 'fill-red-500 text-red-500' : 'text-muted-foreground')} />
							<span className="flex-1 truncate">{label(item.id, item.active)}</span>
							{item.shortcut && <span className="shrink-0 text-xs text-muted-foreground">{formatShortcut(item.shortcut, isMac)}</span>}
						</button>
					)
				})}
			</div>
		</div>
	)
}
