import { invoke } from '@tauri-apps/api/core'

/** Events between the floating dock window and the main window. */
export const DOCK_ACTION_EVENT = 'floating-dock-action'
export const DOCK_STATUS_EVENT = 'floating-dock-status'
export const DOCK_READY_EVENT = 'floating-dock-ready'
export const DOCK_ENABLED_EVENT = 'floating-dock-enabled'
/** From Rust: whether the menu window is showing. */
export const DOCK_MENU_VISIBLE_EVENT = 'floating-dock-menu-visible'
/** From the ball window to the menu window: the pointer entered or left the ball. */
export const DOCK_BALL_HOVER_EVENT = 'floating-dock-ball-hover'

export type DockAction =
	| { type: 'toggle-recording' }
	| { type: 'toggle-dictation' }
	| { type: 'browse' }
	| { type: 'open-main' }
	| { type: 'open-settings' }
	| { type: 'transcribe-paths'; paths: string[] }
	| { type: 'hide-dock' }

export interface DockStatus {
	recording: boolean
	dictating: boolean
	dictationEnabled: boolean
}

export type DockMenuId = 'recording' | 'dictation' | 'browse' | 'open-main' | 'settings' | 'hide-dock'

export interface DockMenuItem {
	id: DockMenuId
	action: DockAction
	/** Recording or dictation is running, so the item stops it. */
	active: boolean
	shortcut: string | null
	disabled: boolean
}

/** A pointer that moved past the threshold is a drag; anything less is a click. */
export function isDrag(start: { x: number; y: number }, now: { x: number; y: number }, threshold = 4): boolean {
	return Math.hypot(now.x - start.x, now.y - start.y) > threshold
}

/** A drag needs the primary button still held (`PointerEvent.buttons`), not just a pointer that moved. */
export function startsDrag(start: { x: number; y: number }, now: { x: number; y: number }, buttons: number): boolean {
	return (buttons & 1) === 1 && isDrag(start, now)
}

/**
 * Call `send` now and every `intervalMs` until `answered()`. The dock and the main window load in
 * either order, so a single request can reach the main window before it listens.
 */
export function requestUntilAnswered(send: () => void, intervalMs = 1000): { answered: () => void; stop: () => void } {
	send()
	const timer = setInterval(send, intervalMs)
	const stop = () => clearInterval(timer)
	return { answered: stop, stop }
}

export type HoverSource = 'ball' | 'menu'

/**
 * Closes the menu once the pointer has been outside both the ball and the menu for `delayMs`. The
 * two live in separate windows, so moving from one to the other is a leave followed by an enter.
 */
export function createHoverCloser(onClose: () => void, delayMs: number) {
	const inside: Record<HoverSource, boolean> = { ball: false, menu: false }
	let timer: ReturnType<typeof setTimeout> | null = null
	const cancel = () => {
		if (timer) clearTimeout(timer)
		timer = null
	}
	const schedule = () => {
		cancel()
		if (inside.ball || inside.menu) return
		timer = setTimeout(() => {
			timer = null
			onClose()
		}, delayMs)
	}
	return {
		set(source: HoverSource, isInside: boolean) {
			inside[source] = isInside
			schedule()
		},
		/** The menu just opened: forget earlier hovers and start counting. */
		reset() {
			inside.menu = false
			schedule()
		},
		dispose: cancel,
	}
}

export function dockMenuItems(status: DockStatus, shortcuts: { recording: string | null; dictation: string | null }): DockMenuItem[] {
	const item = (id: DockMenuId, action: DockAction): DockMenuItem => ({ id, action, active: false, shortcut: null, disabled: false })
	return [
		{ ...item('recording', { type: 'toggle-recording' }), active: status.recording, shortcut: shortcuts.recording, disabled: status.dictating },
		{
			...item('dictation', { type: 'toggle-dictation' }),
			active: status.dictating,
			shortcut: status.dictationEnabled ? shortcuts.dictation : null,
			disabled: !status.dictationEnabled || status.recording,
		},
		item('browse', { type: 'browse' }),
		item('open-main', { type: 'open-main' }),
		item('settings', { type: 'open-settings' }),
		item('hide-dock', { type: 'hide-dock' }),
	]
}

/** `CommandOrControl+Shift+R` → `Ctrl Shift R` (or `⌘ Shift R` on macOS). */
export function formatShortcut(accelerator: string, isMac: boolean): string {
	const names: Record<string, string> = isMac
		? { commandorcontrol: '⌘', cmdorctrl: '⌘', command: '⌘', cmd: '⌘', super: '⌘', alt: '⌥', option: '⌥', control: '⌃', ctrl: '⌃' }
		: { commandorcontrol: 'Ctrl', cmdorctrl: 'Ctrl', control: 'Ctrl', ctrl: 'Ctrl', super: 'Win' }
	return accelerator
		.split('+')
		.map((key) => names[key.toLowerCase()] ?? key)
		.join(' ')
}

export const getFloatingDockEnabled = () => invoke<boolean>('get_floating_dock_enabled')
export const setFloatingDockEnabled = (enabled: boolean) => invoke<void>('set_floating_dock_enabled', { enabled })
export const toggleFloatingDockMenu = () => invoke<void>('toggle_floating_dock_menu')
export const hideFloatingDockMenu = () => invoke<void>('hide_floating_dock_menu')
export const floatingDockMenuReady = (height: number) => invoke<void>('floating_dock_menu_ready', { height })
export const saveFloatingDockPosition = () => invoke<void>('save_floating_dock_position')
/**
 * Closes the menu and moves the ball with the pointer until the button is released. `grabX` and
 * `grabY` are where in the ball the button went down (CSS pixels).
 */
export const startFloatingDockDrag = (grabX: number, grabY: number) => invoke<void>('start_floating_dock_drag', { grabX, grabY })
