import { emit, listen } from '@tauri-apps/api/event'
import { getCurrentWebview } from '@tauri-apps/api/webview'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { platform } from '@tauri-apps/plugin-os'
import { AppWindow, AudioLines, EyeOff, FileAudio, Mic, Settings, Square, type LucideIcon } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from 'react'
import { CONFIG_KEYS } from '~/lib/config-keys'
import { readConfig } from '~/lib/config-store'
import { getDefaultHotkeyShortcut, getDefaultRecordingShortcut } from '~/lib/config'
import {
	DOCK_ACTION_EVENT,
	DOCK_READY_EVENT,
	DOCK_STATUS_EVENT,
	dockMenuItems,
	formatShortcut,
	isDrag,
	saveFloatingDockPosition,
	setFloatingDockExpanded,
	type DockAction,
	type DockMenuId,
	type DockStatus,
	type Placement,
} from '~/lib/floating-dock'
import { supportedLanguages } from '~/lib/i18n'
import { cn } from '~/lib/style'
import { m } from '~/paraglide/messages.js'
import { getLocale, getTextDirection, setLocale } from '~/paraglide/runtime.js'
import logoUrl from '../../../design/logo.png?url'

/** Logical pixels; must match `BALL` and `GAP` in `floating_dock.rs`. */
const BALL = 56
const GAP = 8
const MENU_WIDTH = 248
/** How long the pointer may be outside the open menu before it closes. */
const LEAVE_CLOSE_MS = 700
const DEFAULT_PLACEMENT: Placement = { menuBelow: true, alignRight: false }

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

export default function FloatingDockWindow() {
	const configuredLocale = readConfig(CONFIG_KEYS.displayLanguage, 'en-US')
	if (supportedLanguages[configuredLocale] && configuredLocale !== getLocale()) {
		setLocale(configuredLocale as never, { reload: false })
	}
	const theme = readConfig<'light' | 'dark'>(CONFIG_KEYS.theme, window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
	const direction = getTextDirection(configuredLocale)
	const isMac = platform() === 'macos'

	const [open, setOpen] = useState(false)
	const [placement, setPlacement] = useState<Placement>(DEFAULT_PLACEMENT)
	const [dragOver, setDragOver] = useState(false)
	const [status, setStatus] = useState<DockStatus>({ recording: false, dictating: false, dictationEnabled: false })
	const [shortcuts, setShortcuts] = useState(readShortcuts)
	const menuRef = useRef<HTMLDivElement>(null)
	const openRef = useRef(false)
	const pointerRef = useRef<{ x: number; y: number; dragging: boolean } | null>(null)
	const leaveTimerRef = useRef<number | null>(null)

	useLayoutEffect(() => {
		document.title = m.appTitle()
		document.body.dir = direction
		document.documentElement.classList.toggle('dark', theme === 'dark')
		document.documentElement.style.background = 'transparent'
		document.body.style.background = 'transparent'
		document.body.style.overflow = 'hidden'
	}, [direction, theme])

	useEffect(() => {
		const unlisten = listen<DockStatus>(DOCK_STATUS_EVENT, ({ payload }) => setStatus(payload))
		// Ask only once the listener is in place, so the answer cannot be missed.
		void unlisten.then(() => emit(DOCK_READY_EVENT))
		return () => {
			unlisten.then((dispose) => dispose())
		}
	}, [])

	async function expand() {
		if (openRef.current) return
		openRef.current = true
		setShortcuts(readShortcuts())
		try {
			setPlacement(await setFloatingDockExpanded(true, menuRef.current?.offsetHeight ?? 0))
			setOpen(true)
		} catch (error) {
			openRef.current = false
			console.error('Could not open the floating dock menu:', error)
		}
	}

	async function collapse() {
		if (leaveTimerRef.current) window.clearTimeout(leaveTimerRef.current)
		leaveTimerRef.current = null
		if (!openRef.current) return
		openRef.current = false
		setOpen(false)
		try {
			await setFloatingDockExpanded(false, 0)
		} catch (error) {
			console.error('Could not close the floating dock menu:', error)
		}
		setPlacement(DEFAULT_PLACEMENT)
	}

	// Remember where the ball was dragged, once it settles.
	useEffect(() => {
		let timer: number | undefined
		const unlisten = getCurrentWindow().onMoved(() => {
			window.clearTimeout(timer)
			timer = window.setTimeout(() => {
				if (!openRef.current) void saveFloatingDockPosition().catch((error) => console.error('Could not save the dock position:', error))
			}, 400)
		})
		return () => {
			window.clearTimeout(timer)
			unlisten.then((dispose) => dispose())
		}
	}, [])

	// Files dropped on the ball are transcribed by the main window.
	useEffect(() => {
		const unlisten = getCurrentWebview().onDragDropEvent(({ payload }) => {
			if (payload.type === 'enter' || payload.type === 'over') setDragOver(true)
			else if (payload.type === 'leave') setDragOver(false)
			else if (payload.type === 'drop') {
				setDragOver(false)
				if (payload.paths.length) void emit(DOCK_ACTION_EVENT, { type: 'transcribe-paths', paths: payload.paths } satisfies DockAction)
			}
		})
		return () => {
			unlisten.then((dispose) => dispose())
		}
	}, [])

	function onBallPointerDown(event: PointerEvent<HTMLButtonElement>) {
		if (event.button !== 0) return
		pointerRef.current = { x: event.screenX, y: event.screenY, dragging: false }
	}

	async function onBallPointerMove(event: PointerEvent<HTMLButtonElement>) {
		const pointer = pointerRef.current
		if (!pointer || pointer.dragging || !isDrag(pointer, { x: event.screenX, y: event.screenY })) return
		pointer.dragging = true
		await collapse()
		try {
			await getCurrentWindow().startDragging()
		} catch (error) {
			console.error('Could not drag the floating dock:', error)
		}
		pointerRef.current = null
	}

	function onBallPointerUp() {
		const pointer = pointerRef.current
		pointerRef.current = null
		if (!pointer || pointer.dragging) return
		if (openRef.current) void collapse()
		else void expand()
	}

	function onPointerLeave() {
		if (!openRef.current) return
		leaveTimerRef.current = window.setTimeout(() => void collapse(), LEAVE_CLOSE_MS)
	}

	function onPointerEnter() {
		if (leaveTimerRef.current) window.clearTimeout(leaveTimerRef.current)
		leaveTimerRef.current = null
	}

	async function run(action: DockAction) {
		await collapse()
		await emit(DOCK_ACTION_EVENT, action)
	}

	const vertical = placement.menuBelow ? 'top-0' : 'bottom-0'
	const horizontal = placement.alignRight ? 'right-0' : 'left-0'
	const menuOffset = { [placement.menuBelow ? 'top' : 'bottom']: BALL + GAP }
	const busy = status.recording || status.dictating

	return (
		<div className="relative h-screen w-screen select-none" onPointerLeave={onPointerLeave} onPointerEnter={onPointerEnter}>
			<button
				type="button"
				aria-label={m.appTitle()}
				aria-expanded={open}
				title={dragOver ? m.floatingDockDrop() : m.appTitle()}
				onPointerDown={onBallPointerDown}
				onPointerMove={(event) => void onBallPointerMove(event)}
				onPointerUp={onBallPointerUp}
				style={{ width: BALL, height: BALL }}
				className={cn(
					'absolute flex items-center justify-center rounded-full bg-card shadow-[0_2px_10px_rgba(0,0,0,0.25)] ring-1 ring-border/60 transition-transform',
					vertical,
					horizontal,
					dragOver && 'scale-110 ring-4 ring-primary',
				)}>
				<img src={logoUrl} alt="" draggable={false} className="pointer-events-none h-9 w-9" />
				{busy && <span className="absolute right-1 top-1 h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />}
			</button>

			<div
				ref={menuRef}
				role="menu"
				aria-hidden={!open}
				style={{ width: MENU_WIDTH, ...menuOffset }}
				className={cn(
					'absolute rounded-2xl border border-border/60 bg-card p-1.5 text-card-foreground shadow-[0_4px_18px_rgba(0,0,0,0.22)]',
					horizontal,
					!open && 'invisible',
				)}>
				{dockMenuItems(status, shortcuts).map((item) => {
					const Icon = (item.active && icons[item.id].active) || icons[item.id].idle
					return (
						<button
							key={item.id}
							type="button"
							role="menuitem"
							disabled={item.disabled}
							tabIndex={open ? 0 : -1}
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
