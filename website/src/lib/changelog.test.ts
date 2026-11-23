import { describe, expect, it } from 'vitest'
import { findRelease, loadReleases, releases } from './changelog'

describe('changelog', () => {
	it('starts at Otter 0.1.0', () => {
		expect(releases.map((release) => release.version)).toEqual(['0.1.0'])
		expect(releases[0].date).toBe('2026-11-23')
	})

	it('finds nothing for a version from before Otter 0.1.0, so the page shows the unknown-version message', () => {
		expect(findRelease('3.3.8')).toBeUndefined()
		expect(findRelease('v0.1.0')?.version).toBe('0.1.0')
	})

	it('has the 0.1.0 notes in Traditional Chinese', async () => {
		const [release] = await loadReleases('zh-TW')
		expect(release.locale).toBe('zh-TW')
		expect(release.items.length).toBe(releases[0].items.length)
	})
})
