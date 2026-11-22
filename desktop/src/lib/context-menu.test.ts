// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { blockNativeContextMenu } from './context-menu'

function rightClick() {
	const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
	document.body.dispatchEvent(event)
	return event
}

let dispose: () => void = () => {}
afterEach(() => dispose())

describe('blockNativeContextMenu', () => {
	it("hides the webview's own menu in production", () => {
		dispose = blockNativeContextMenu(false)
		expect(rightClick().defaultPrevented).toBe(true)
	})

	it('keeps it in development for Inspect and Refresh', () => {
		dispose = blockNativeContextMenu(true)
		expect(rightClick().defaultPrevented).toBe(false)
	})

	it('still lets the app show its own menu', () => {
		dispose = blockNativeContextMenu(false)
		let opened = false
		const listener = () => (opened = true)
		document.body.addEventListener('contextmenu', listener)
		rightClick()
		document.body.removeEventListener('contextmenu', listener)
		expect(opened).toBe(true)
	})
})
