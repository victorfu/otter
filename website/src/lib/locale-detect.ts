/**
 * Paraglide's `preferredLanguage` matches a browser tag only exactly or by its bare language, so
 * `zh-Hant` or `zh-Hant-TW` would fall through to English and `zh-MO` would never reach zh-HK.
 * This maps every Chinese tag to one of the site's three Chinese locales by script and region.
 */
export type ChineseLocale = 'zh-TW' | 'zh-HK' | 'zh-CN'

export function chineseLocaleFor(tag: string): ChineseLocale | undefined {
	const parts = tag.toLowerCase().split(/[-_]/)
	if (parts[0] !== 'zh') return undefined
	if (parts.includes('hk') || parts.includes('mo')) return 'zh-HK'
	if (parts.includes('tw') || parts.includes('hant')) return 'zh-TW'
	return 'zh-CN'
}

/** Only the visitor's first language counts: an English-first browser stays English. */
export function detectChineseLocale(languages: readonly string[]): ChineseLocale | undefined {
	return languages.length ? chineseLocaleFor(languages[0]) : undefined
}
