import { invoke } from '@tauri-apps/api/core'

/** Events between the floating dock window and the main window. */
export const DOCK_ACTION_EVENT = 'floating-dock-action'
export const DOCK_STATUS_EVENT = 'floating-dock-status'
export const DOCK_READY_EVENT = 'floating-dock-ready'
export const DOCK_ENABLED_EVENT = 'floating-dock-enabled'

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

export interface Placement {
	menuBelow: boolean
	alignRight: boolean
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
export const setFloatingDockExpanded = (expanded: boolean, menuHeight: number) =>
	invoke<Placement>('set_floating_dock_expanded', { expanded, menuHeight })
export const saveFloatingDockPosition = () => invoke<void>('save_floating_dock_position')
