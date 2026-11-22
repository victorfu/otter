// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useDropTarget } from './use-drop-target'

type DragDropPayload = { type: 'enter' | 'over'; paths?: string[] } | { type: 'drop'; paths: string[] } | { type: 'leave' }

const mocks = vi.hoisted(() => ({
	globalListen: vi.fn(async () => () => {}),
	handler: null as ((event: { payload: DragDropPayload }) => void) | null,
}))
vi.mock('@tauri-apps/api/event', () => ({ listen: mocks.globalListen }))
vi.mock('@tauri-apps/api/webview', () => ({
	getCurrentWebview: () => ({
		onDragDropEvent: vi.fn(async (handler: (event: { payload: DragDropPayload }) => void) => {
			mocks.handler = handler
			return () => {
				mocks.handler = null
			}
		}),
	}),
}))
vi.mock('sonner', () => ({ toast: { info: vi.fn() } }))

afterEach(() => cleanup())

describe('useDropTarget', () => {
	it('ignores drops delivered to another window', async () => {
		const onPaths = vi.fn()
		renderHook(() => useDropTarget(onPaths))
		await waitFor(() => expect(mocks.handler).not.toBeNull())
		// Window-wide tauri:// listeners would also hear drops on the floating dock.
		expect(mocks.globalListen).not.toHaveBeenCalledWith('tauri://drag-drop', expect.anything())
		act(() => mocks.handler?.({ payload: { type: 'drop', paths: ['C:/a.mp3'] } }))
		expect(onPaths).toHaveBeenCalledExactlyOnceWith(['C:/a.mp3'])
	})

	it('shows the drag state between enter and leave', async () => {
		const { result } = renderHook(() => useDropTarget(vi.fn()))
		await waitFor(() => expect(mocks.handler).not.toBeNull())
		act(() => mocks.handler?.({ payload: { type: 'enter', paths: ['C:/a.mp3'] } }))
		expect(result.current).toBe(true)
		act(() => mocks.handler?.({ payload: { type: 'leave' } }))
		expect(result.current).toBe(false)
	})
})
