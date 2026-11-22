// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DockAction, DockStatus } from '~/lib/floating-dock'
import { useDockBridge, type DockBridgeDeps } from './floating-dock-bridge'

const mocks = vi.hoisted(() => ({
	listeners: new Map<string, (event: { payload: unknown }) => void>(),
	emitted: [] as { name: string; payload: unknown }[],
}))
vi.mock('@tauri-apps/api/event', () => ({
	listen: vi.fn(async (name: string, callback: (event: { payload: unknown }) => void) => {
		mocks.listeners.set(name, callback)
		return () => mocks.listeners.delete(name)
	}),
	emit: vi.fn(async (name: string, payload?: unknown) => {
		mocks.emitted.push({ name, payload })
	}),
}))

const idle: DockStatus = { recording: false, dictating: false, dictationEnabled: true }

function setup(overrides: Partial<DockBridgeDeps> = {}) {
	const deps: DockBridgeDeps = {
		status: idle,
		toggleRecording: vi.fn(async () => {}),
		toggleDictation: vi.fn(async () => {}),
		showMain: vi.fn(async () => {}),
		openSettings: vi.fn(),
		setDockEnabled: vi.fn(async () => {}),
		...overrides,
	}
	const hook = renderHook((props: DockBridgeDeps) => useDockBridge(props), { initialProps: deps })
	return { deps, hook }
}

async function dispatch(action: DockAction) {
	await waitFor(() => expect(mocks.listeners.has('floating-dock-action')).toBe(true))
	await act(async () => mocks.listeners.get('floating-dock-action')?.({ payload: action }))
}

function lastStatus() {
	const statuses = mocks.emitted.filter((event) => event.name === 'floating-dock-status')
	return statuses[statuses.length - 1]?.payload
}

beforeEach(() => {
	mocks.listeners.clear()
	mocks.emitted.length = 0
})
afterEach(() => cleanup())

describe('useDockBridge', () => {
	it('toggles recording without showing the main window', async () => {
		const { deps } = setup()
		await dispatch({ type: 'toggle-recording' })
		expect(deps.toggleRecording).toHaveBeenCalledOnce()
		expect(deps.showMain).not.toHaveBeenCalled()
	})

	it('toggles dictation without showing the main window', async () => {
		const { deps } = setup()
		await dispatch({ type: 'toggle-dictation' })
		expect(deps.toggleDictation).toHaveBeenCalledOnce()
		expect(deps.showMain).not.toHaveBeenCalled()
	})

	it('shows the main window before browsing', async () => {
		const { deps, hook } = setup()
		const browse = vi.fn()
		hook.result.current.register({ transcribePaths: vi.fn(), browse })
		await dispatch({ type: 'browse' })
		expect(deps.showMain).toHaveBeenCalled()
		expect(browse).toHaveBeenCalledOnce()
	})

	it('queues dropped paths once and brings the main window forward', async () => {
		const { deps, hook } = setup()
		const transcribePaths = vi.fn()
		hook.result.current.register({ transcribePaths, browse: vi.fn() })
		await dispatch({ type: 'transcribe-paths', paths: ['C:/a.mp3'] })
		expect(transcribePaths).toHaveBeenCalledExactlyOnceWith(['C:/a.mp3'])
		expect(deps.showMain).toHaveBeenCalled()
	})

	it('only shows the main window when no session has registered', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		const { deps } = setup()
		await dispatch({ type: 'transcribe-paths', paths: ['C:/a.mp3'] })
		expect(deps.showMain).toHaveBeenCalled()
		warn.mockRestore()
	})

	it('stops calling a session after it unregisters', async () => {
		const { hook } = setup()
		const browse = vi.fn()
		const unregister = hook.result.current.register({ transcribePaths: vi.fn(), browse })
		unregister()
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		await dispatch({ type: 'browse' })
		expect(browse).not.toHaveBeenCalled()
		warn.mockRestore()
	})

	it('opens settings in the main window', async () => {
		const { deps } = setup()
		await dispatch({ type: 'open-settings' })
		expect(deps.showMain).toHaveBeenCalled()
		expect(deps.openSettings).toHaveBeenCalledOnce()
	})

	it('hides the dock by turning the setting off', async () => {
		const { deps } = setup()
		await dispatch({ type: 'hide-dock' })
		expect(deps.setDockEnabled).toHaveBeenCalledWith(false)
	})

	it('answers a ready dock with the current status', async () => {
		setup()
		await waitFor(() => expect(mocks.listeners.has('floating-dock-ready')).toBe(true))
		mocks.emitted.length = 0
		await act(async () => mocks.listeners.get('floating-dock-ready')?.({ payload: undefined }))
		expect(lastStatus()).toEqual(idle)
	})

	it('sends the status again when recording starts', async () => {
		const { deps, hook } = setup()
		hook.rerender({ ...deps, status: { ...idle, recording: true } })
		await waitFor(() => expect(lastStatus()).toEqual({ ...idle, recording: true }))
	})
})
