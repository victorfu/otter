/**
 * Picks the site locale for the visitor's first browser language. Paraglide's own
 * `preferredLanguage` matches a tag only exactly or by a bare-language locale, and every site
 * locale carries a region (`fr-FR`, `ja-JP`), so `fr-CA`, `ja` or `zh-Hant` fell through to
 * English. Chinese is mapped by script and region; any other language goes to the one site locale
 * that speaks it.
 */
export type ChineseLocale = 'zh-TW' | 'zh-HK' | 'zh-CN'

export function chineseLocaleFor(tag: string): ChineseLocale | undefined {
	const parts = tag.toLowerCase().split(/[-_]/)
	if (parts[0] !== 'zh') return undefined
	if (parts.includes('hk') || parts.includes('mo')) return 'zh-HK'
	if (parts.includes('tw') || parts.includes('hant')) return 'zh-TW'
	return 'zh-CN'
}

/** Browser language codes that name a site language under another code. */
const ALIASES: Record<string, string> = { nb: 'no', nn: 'no', iw: 'he' }

export function siteLocaleFor<L extends string>(tag: string, locales: readonly L[]): L | undefined {
	const chinese = chineseLocaleFor(tag)
	if (chinese) return locales.find((locale) => locale === chinese)
	const exact = locales.find((locale) => locale.toLowerCase() === tag.toLowerCase())
	if (exact) return exact
	const language = tag.toLowerCase().split(/[-_]/)[0]
	const wanted = ALIASES[language] ?? language
	return locales.find((locale) => locale.toLowerCase().split('-')[0] === wanted)
}

/** Only the visitor's first language counts: an Italian-first browser is not sent to French. */
export function detectSiteLocale<L extends string>(languages: readonly string[], locales: readonly L[]): L | undefined {
	return languages.length ? siteLocaleFor(languages[0], locales) : undefined
}
