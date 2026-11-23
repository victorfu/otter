import { describe, expect, it } from 'vitest'
import { chineseLocaleFor, detectSiteLocale, siteLocaleFor } from './locale-detect'

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


describe('siteLocaleFor', () => {
	const site = ['en-US', 'fr-FR', 'ja-JP', 'pt-BR', 'es-MX', 'no-NO', 'he-IL', 'de-DE', 'zh-CN', 'zh-HK', 'zh-TW'] as const

	it.each([
		['fr-CA', 'fr-FR'],
		['ja', 'ja-JP'],
		['de-AT', 'de-DE'],
		['pt-PT', 'pt-BR'],
		['es-ES', 'es-MX'],
		['nb-NO', 'no-NO'],
		['nn', 'no-NO'],
		['iw', 'he-IL'],
		['en-GB', 'en-US'],
		['zh-Hant', 'zh-TW'],
	])('%s → %s', (tag, locale) => expect(siteLocaleFor(tag, site)).toBe(locale))

	it('returns nothing for a language the site does not have', () => {
		expect(siteLocaleFor('it-IT', site)).toBeUndefined()
	})

	it('only looks at the first browser language', () => {
		expect(detectSiteLocale(['fr-CA', 'en-US'], site)).toBe('fr-FR')
		expect(detectSiteLocale(['it-IT', 'fr-FR'], site)).toBeUndefined()
	})
})
