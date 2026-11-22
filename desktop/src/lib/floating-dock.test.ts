// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { dockMenuItems, formatShortcut, isDrag, requestUntilAnswered, startsDrag } from './floating-dock'

describe('startsDrag', () => {
	it('starts a drag only while the primary button is held', () => {
		expect(startsDrag({ x: 0, y: 0 }, { x: 10, y: 0 }, 1)).toBe(true)
		// Pressed at the edge and released outside the window: a later hover must not drag it.
		expect(startsDrag({ x: 0, y: 0 }, { x: 10, y: 0 }, 0)).toBe(false)
	})
})

describe('requestUntilAnswered', () => {
	afterEach(() => vi.useRealTimers())

	it('asks again until an answer arrives, then stops', () => {
		vi.useFakeTimers()
		const send = vi.fn()
		const request = requestUntilAnswered(send, 1000)
		expect(send).toHaveBeenCalledTimes(1)
		vi.advanceTimersByTime(2000)
		expect(send).toHaveBeenCalledTimes(3)
		request.answered()
		vi.advanceTimersByTime(5000)
		expect(send).toHaveBeenCalledTimes(3)
	})

	it('stops asking when cancelled', () => {
		vi.useFakeTimers()
		const send = vi.fn()
		requestUntilAnswered(send, 1000).stop()
		vi.advanceTimersByTime(5000)
		expect(send).toHaveBeenCalledTimes(1)
	})
})

const idle = { recording: false, dictating: false, dictationEnabled: true }
const keys = { recording: 'Alt+Shift+R', dictation: 'Ctrl+Space' }

describe('isDrag', () => {
	it('treats small jitter as a click', () => {
		expect(isDrag({ x: 0, y: 0 }, { x: 3, y: 2 })).toBe(false)
	})
	it('treats a move beyond 4px as a drag', () => {
		expect(isDrag({ x: 0, y: 0 }, { x: 5, y: 0 })).toBe(true)
	})
})

describe('dockMenuItems', () => {
	it('lists the menu in order with shortcuts', () => {
		const items = dockMenuItems(idle, keys)
		expect(items.map((item) => item.id)).toEqual(['recording', 'dictation', 'browse', 'open-main', 'settings', 'hide-dock'])
		expect(items[0]).toMatchObject({ active: false, shortcut: 'Alt+Shift+R', action: { type: 'toggle-recording' } })
	})
	it('marks recording active so the label reads "stop"', () => {
		expect(dockMenuItems({ ...idle, recording: true }, keys)[0].active).toBe(true)
	})
	it('disables recording while dictating, and dictation while recording', () => {
		expect(dockMenuItems({ ...idle, dictating: true }, keys)[0].disabled).toBe(true)
		expect(dockMenuItems({ ...idle, recording: true }, keys)[1].disabled).toBe(true)
	})
	it('disables dictation when global dictation is turned off', () => {
		expect(dockMenuItems({ ...idle, dictationEnabled: false }, keys)[1]).toMatchObject({ disabled: true, shortcut: null })
	})
})

describe('formatShortcut', () => {
	it('separates keys with spaces like the menu shows them', () => {
		expect(formatShortcut('Alt+Shift+R', false)).toBe('Alt Shift R')
	})
	it('shows CommandOrControl as Ctrl off macOS and ⌘ on macOS', () => {
		expect(formatShortcut('CommandOrControl+Shift+R', false)).toBe('Ctrl Shift R')
		expect(formatShortcut('CommandOrControl+Shift+R', true)).toBe('⌘ Shift R')
	})
})
