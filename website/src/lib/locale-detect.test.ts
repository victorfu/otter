import { describe, expect, it } from 'vitest'
import { chineseLocaleFor, detectChineseLocale } from './locale-detect'

describe('chineseLocaleFor', () => {
	it.each([
		['zh-TW', 'zh-TW'],
		['zh-Hant', 'zh-TW'],
		['zh-Hant-TW', 'zh-TW'],
		['zh-hant', 'zh-TW'],
		['zh-HK', 'zh-HK'],
		['zh-MO', 'zh-HK'],
		['zh-Hant-HK', 'zh-HK'],
		['zh-CN', 'zh-CN'],
		['zh-Hans', 'zh-CN'],
		['zh-SG', 'zh-CN'],
		['zh', 'zh-CN'],
	])('%s → %s', (tag, locale) => expect(chineseLocaleFor(tag)).toBe(locale))

	it('leaves other languages to Paraglide', () => {
		for (const tag of ['en-US', 'fr-CA', 'ja', '']) expect(chineseLocaleFor(tag)).toBeUndefined()
	})
})

describe('detectChineseLocale', () => {
	it('uses the first language that is Chinese only if it comes first', () => {
		expect(detectChineseLocale(['zh-Hant-TW', 'en-US'])).toBe('zh-TW')
		expect(detectChineseLocale(['en-US', 'zh-TW'])).toBeUndefined()
		expect(detectChineseLocale([])).toBeUndefined()
	})
})
