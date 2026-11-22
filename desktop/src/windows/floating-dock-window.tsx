import { emit, listen } from '@tauri-apps/api/event'
import { getCurrentWebview } from '@tauri-apps/api/webview'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { useEffect, useRef, useState, type PointerEvent } from 'react'
import {
	DOCK_ACTION_EVENT,
	DOCK_BALL_HOVER_EVENT,
	DOCK_MENU_VISIBLE_EVENT,
	hideFloatingDockMenu,
	saveFloatingDockPosition,
	startsDrag,
	toggleFloatingDockMenu,
	type DockAction,
} from '~/lib/floating-dock'
import { cn } from '~/lib/style'
import { m } from '~/paraglide/messages.js'
import logoUrl from '../../../design/logo.png?url'
import { PAD, useDockStatus, useDockWindowSetup } from './floating-dock-shared'

/** Logical pixels; must match `BALL` in `floating_dock.rs`. */
const BALL = 56

/**
 * The ball. Its window never resizes or moves on its own: the menu is a separate window that Rust
 * places beside it, so opening the menu cannot make the ball jump.
 */
export default function FloatingDockWindow() {
	useDockWindowSetup()
	const status = useDockStatus()
	const [menuOpen, setMenuOpen] = useState(false)
	const [dragOver, setDragOver] = useState(false)
	const pointerRef = useRef<{ x: number; y: number; dragging: boolean } | null>(null)

	useEffect(() => {
		const unlisten = listen<boolean>(DOCK_MENU_VISIBLE_EVENT, ({ payload }) => setMenuOpen(payload))
		return () => {
			unlisten.then((dispose) => dispose())
		}
	}, [])

	// Remember where the ball was dragged, once it settles.
	useEffect(() => {
		let timer: number | undefined
		const unlisten = getCurrentWindow().onMoved(() => {
			window.clearTimeout(timer)
			timer = window.setTimeout(() => {
				void saveFloatingDockPosition().catch((error) => console.error('Could not save the dock position:', error))
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

	function onPointerDown(event: PointerEvent<HTMLButtonElement>) {
		if (event.button !== 0) return
		pointerRef.current = { x: event.screenX, y: event.screenY, dragging: false }
	}

	async function onPointerMove(event: PointerEvent<HTMLButtonElement>) {
		const pointer = pointerRef.current
		if (!pointer || pointer.dragging) return
		if (!(event.buttons & 1)) {
			// The button was released outside the window; this is a hover, not a drag.
			pointerRef.current = null
			return
		}
		if (!startsDrag(pointer, { x: event.screenX, y: event.screenY }, event.buttons)) return
		pointer.dragging = true
		try {
			await hideFloatingDockMenu()
			await getCurrentWindow().startDragging()
		} catch (error) {
			console.error('Could not drag the floating dock:', error)
		}
		pointerRef.current = null
	}

	function onPointerUp() {
		const pointer = pointerRef.current
		pointerRef.current = null
		if (!pointer || pointer.dragging) return
		void toggleFloatingDockMenu().catch((error) => console.error('Could not open the floating dock menu:', error))
	}

	const hover = (inside: boolean) => void emit(DOCK_BALL_HOVER_EVENT, inside)
	const busy = status.recording || status.dictating

	return (
		// The transparent padding leaves room for the shadow; without it the shadow is clipped to a square.
		<div className="h-screen w-screen select-none" style={{ padding: PAD }}>
			<button
				type="button"
				aria-label={m.appTitle()}
				aria-haspopup="menu"
				aria-expanded={menuOpen}
				title={dragOver ? m.floatingDockDrop() : m.appTitle()}
				onPointerDown={onPointerDown}
				onPointerMove={(event) => void onPointerMove(event)}
				onPointerUp={onPointerUp}
				onPointerEnter={() => hover(true)}
				onPointerLeave={() => hover(false)}
				style={{ width: BALL, height: BALL }}
				className={cn(
					'relative flex items-center justify-center rounded-full bg-card shadow-[0_2px_10px_rgba(0,0,0,0.25)] ring-1 ring-border/60 transition-transform',
					dragOver && 'scale-110 ring-4 ring-primary',
				)}>
				<img src={logoUrl} alt="" draggable={false} className="pointer-events-none h-9 w-9" />
				{busy && <span className="absolute right-1 top-1 h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />}
			</button>
		</div>
	)
}
