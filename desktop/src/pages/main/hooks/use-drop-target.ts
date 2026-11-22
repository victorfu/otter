import { type UnlistenFn } from '@tauri-apps/api/event'
import { getCurrentWebview } from '@tauri-apps/api/webview'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

/**
 * Drag & drop for the whole window.
 *
 * The webview delivers real filesystem paths through `tauri://drag-drop`. In browser mock mode
 * those events never fire and the HTML5 `File` objects carry no path we could transcribe, so a
 * browser drop only explains that the mock dialog (Browse) is the way in.
 */
export function useDropTarget(onPaths: (paths: string[]) => void) {
	const [dragging, setDragging] = useState(false)
	const onPathsRef = useRef(onPaths)
	const browserDepth = useRef(0)

	useEffect(() => {
		onPathsRef.current = onPaths
	}, [onPaths])

	useEffect(() => {
		// Only this webview's drops: a global listen('tauri://drag-drop') also hears files dropped on
		// the floating dock, which would queue them twice.
		const unlisteners: Promise<UnlistenFn>[] = []
		unlisteners.push(
			getCurrentWebview().onDragDropEvent(({ payload }) => {
				if (payload.type === 'enter') setDragging(true)
				else if (payload.type === 'leave') setDragging(false)
				else if (payload.type === 'drop') {
					setDragging(false)
					if (payload.paths.length) onPathsRef.current(payload.paths)
				}
			}),
		)

		function onDragEnter(event: DragEvent) {
			event.preventDefault()
			browserDepth.current += 1
			setDragging(true)
		}
		function onDragOver(event: DragEvent) {
			event.preventDefault()
		}
		function onDragLeave(event: DragEvent) {
			event.preventDefault()
			browserDepth.current = Math.max(0, browserDepth.current - 1)
			if (browserDepth.current === 0) setDragging(false)
		}
		function onDrop(event: DragEvent) {
			event.preventDefault()
			browserDepth.current = 0
			setDragging(false)
			const files = Array.from(event.dataTransfer?.files ?? [])
			// Only reachable in a plain browser — the webview swallows HTML drops.
			if (files.length > 0) {
				toast.info(`Browser preview can't read “${files[0].name}” from disk. Use Browse to pick a file.`, { position: 'bottom-center' })
			}
		}

		window.addEventListener('dragenter', onDragEnter)
		window.addEventListener('dragover', onDragOver)
		window.addEventListener('dragleave', onDragLeave)
		window.addEventListener('drop', onDrop)

		return () => {
			unlisteners.forEach((promise) => promise.then((unlisten) => unlisten()))
			window.removeEventListener('dragenter', onDragEnter)
			window.removeEventListener('dragover', onDragOver)
			window.removeEventListener('dragleave', onDragLeave)
			window.removeEventListener('drop', onDrop)
		}
	}, [])

	return dragging
}
