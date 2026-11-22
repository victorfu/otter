// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '~/components/ui/tooltip'
import { initialUpdateState } from '~/lib/updater'
import { m } from '~/paraglide/messages.js'
import { UpdaterContext } from '~/providers/updater'
import { GeneralSection } from './general'
import type { SettingsViewModel } from './shared'

vi.mock('@tauri-apps/plugin-autostart', () => ({ isEnabled: vi.fn(async () => false), enable: vi.fn(), disable: vi.fn() }))
vi.mock('@tauri-apps/plugin-opener', () => ({ openUrl: vi.fn() }))
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }))

const dock = vi.hoisted(() => ({
	enabled: false,
	set: vi.fn(async () => {}),
	listeners: new Map<string, (event: { payload: unknown }) => void>(),
}))
vi.mock('~/lib/floating-dock', () => ({
	DOCK_ENABLED_EVENT: 'floating-dock-enabled',
	getFloatingDockEnabled: vi.fn(async () => dock.enabled),
	setFloatingDockEnabled: dock.set,
}))
vi.mock('@tauri-apps/api/event', () => ({
	listen: vi.fn(async (name: string, callback: (event: { payload: unknown }) => void) => {
		dock.listeners.set(name, callback)
		return () => dock.listeners.delete(name)
	}),
}))

const vm = {
	preference: { displayLanguage: 'en-US', theme: 'light', closeToTray: false, preventSleep: false },
	reportIssue: vi.fn(),
} as unknown as SettingsViewModel

afterEach(() => cleanup())

function mount({ autoUpdate = true } = {}) {
	const value = {
		state: initialUpdateState,
		availableUpdate: false,
		updateApp: vi.fn(),
		checkNow: vi.fn(),
		installNow: vi.fn(),
		remindLater: vi.fn(),
		channel: 'stable' as const,
		setChannel: vi.fn(),
		autoUpdate,
		setAutoUpdate: vi.fn(),
		fakeUpdate: false,
		setFakeUpdate: vi.fn(),
	}
	render(
		<TooltipProvider>
			<UpdaterContext.Provider value={value}>
				<GeneralSection vm={vm} />
			</UpdaterContext.Provider>
		</TooltipProvider>,
	)
}

/** The switch in the row whose label is `label`. */
function switchFor(label: string) {
	const row = screen.getByText(label).closest('div.flex.min-h-\\[52px\\]') as HTMLElement
	return row.querySelector('[role="switch"]') as HTMLButtonElement
}

describe('floating dock setting', () => {
	it('turns the floating dock on from settings', async () => {
		dock.enabled = false
		dock.set.mockClear()
		mount()
		await waitFor(() => expect(switchFor(m.floatingDock()).getAttribute('aria-checked')).toBe('false'))
		fireEvent.click(switchFor(m.floatingDock()))
		await waitFor(() => expect(dock.set).toHaveBeenCalledWith(true))
		expect(switchFor(m.floatingDock()).getAttribute('aria-checked')).toBe('true')
	})

	it('reflects a change made from the tray', async () => {
		dock.enabled = false
		mount()
		await waitFor(() => expect(dock.listeners.has('floating-dock-enabled')).toBe(true))
		act(() => dock.listeners.get('floating-dock-enabled')?.({ payload: true }))
		expect(switchFor(m.floatingDock()).getAttribute('aria-checked')).toBe('true')
	})
})

describe('update settings', () => {
	it('shows automatic downloads as on by default and off when turned off', () => {
		mount()
		expect(switchFor(m.autoUpdate()).getAttribute('aria-checked')).toBe('true')
		cleanup()
		mount({ autoUpdate: false })
		expect(switchFor(m.autoUpdate()).getAttribute('aria-checked')).toBe('false')
		expect(switchFor(m.autoUpdate()).disabled).toBe(false)
	})
})
