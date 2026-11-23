/**
 * The model catalog shown on /models. The one source is `website/public/models.json`, which is
 * also served as-is for the desktop app to fetch; the page bundles the same file (see `modelCatalog` in
 * vite.config.ts).
 */
import catalog from 'virtual:model-catalog'

export const tags = ['recommended', 'accurate', 'fast', 'small', 'dictation'] as const
export type Tag = (typeof tags)[number]

export interface Model {
	id: string
	name: string
	/** ISO 639-1 codes, optionally with a region (`zh-TW`), or `['*']` for a multilingual model. */
	languages: string[]
	tags: Tag[]
	publisher: { name: string; url: string }
	license: string
	/** The one file Install downloads. */
	url: string
	/** Other addresses of the same file (same `sha256`); the app falls back to them in order. */
	mirrors?: string[]
	size: number
	sha256: string
	/** First app version able to run it; absent when every supported version can. */
	minAppVersion?: string
	/** Locale code to text. `en-US` is always there. */
	description: Record<string, string>
}

/** The picker's value for "show me the multilingual models". */
export const ANY_LANGUAGE = 'any'

export const models = catalog.models

const isMultilingual = (model: Model) => model.languages.includes('*')

/** `zh-tw` → `zh-TW`: lowercase language, uppercase region, as the catalog writes them. */
function canonical(code: string) {
	const [language, region] = code.split('-')
	return region ? `${language.toLowerCase()}-${region.toUpperCase()}` : language.toLowerCase()
}

/** The models for a language: its own first, then, for a regional one (`zh-TW`), those for the language as a whole. */
function modelsForLanguage(language: string) {
	const base = language.split('-')[0]
	const own = models.filter((model) => languagesOf(model).includes(language))
	const general = base === language ? [] : models.filter((model) => !own.includes(model) && languagesOf(model).includes(base))
	return [...own, ...general]
}

/** For a language as a whole (`zh`), its regional models (`zh-TW`): listed last, never its recommendation. */
function regionalModels(language: string) {
	if (language.includes('-')) return []
	return models.filter((model) => {
		const codes = languagesOf(model)
		return !codes.includes(language) && codes.some((code) => code.split('-')[0] === language && code !== language)
	})
}

/**
 * The languages a model is for. `["zh", "zh-TW"]` is a Chinese (Taiwan) model: the bare language is
 * there for apps that predate regions, which drop `zh-TW` and would otherwise drop the whole model.
 */
export function languagesOf(model: Model) {
	return model.languages.filter((code) => !model.languages.some((other) => other !== code && other.split('-')[0] === code))
}

/** Every language at least one model is made for, in no particular order. */
export const catalogLanguages = [...new Set(models.flatMap((model) => languagesOf(model).filter((code) => code !== '*')))]

function recommendedFirst(list: Model[]) {
	return [...list.filter((model) => model.tags.includes('recommended')), ...list.filter((model) => !model.tags.includes('recommended'))]
}

export interface ModelGroups {
	/** The single model to lift, always the first of `first`. */
	top: Model | undefined
	/** The cards above the divider. */
	first: Model[]
	/** The cards below it; no divider when empty. */
	rest: Model[]
	/** What the divider says about `rest`: they work in every language, or each is for specific ones. */
	divider: 'every' | 'specific'
}

/**
 * For a language: its recommended model leads (the language's own, else the multilingual one),
 * then the language's other models, then the remaining multilingual ones under the divider.
 * For "any language": the multilingual models with the recommended one leading, then every
 * language-limited model under the divider. Within a group the catalog's order is kept.
 */
export function modelsFor(language: string): ModelGroups {
	const multilingual = recommendedFirst(models.filter(isMultilingual))
	if (language === ANY_LANGUAGE) {
		const top = multilingual.find((model) => model.tags.includes('recommended'))
		return { top, first: multilingual, rest: models.filter((model) => !isMultilingual(model)), divider: 'specific' }
	}
	const specific = recommendedFirst(modelsForLanguage(language))
	const top = [...specific, ...multilingual].find((model) => model.tags.includes('recommended'))
	const others = (list: Model[]) => list.filter((model) => model !== top)
	return { top, first: [...(top ? [top] : []), ...others(specific), ...regionalModels(language)], rest: others(multilingual), divider: 'every' }
}

/** The picker's starting point: the site's locale (`zh-TW`) or its language (`zh`) when the catalog knows it. */
export function defaultLanguage(locale: string) {
	const regional = canonical(locale)
	if (catalogLanguages.includes(regional)) return regional
	const language = locale.split('-')[0].toLowerCase()
	return catalogLanguages.includes(language) ? language : ANY_LANGUAGE
}

/** Reads `?lang=`; anything the catalog has no models for is ignored. */
export function languageFromParam(param: string | null) {
	if (!param) return null
	if (param.toLowerCase() === ANY_LANGUAGE) return ANY_LANGUAGE
	const wanted = canonical(param)
	return catalogLanguages.includes(wanted) ? wanted : null
}

/**
 * The link that opens a model in the app. The address goes in as-is: on macOS the app takes
 * everything after the prefix verbatim, so an encoded address would be downloaded encoded.
 */
export function deepLink(url: string) {
	return `otter://download/?url=${url}`
}

/** The description in this locale, else in the same language, else in English. */
export function describe(model: Model, locale: string): { text: string; locale: string } {
	const language = locale.split('-')[0]
	const found = model.description[locale] ? locale : Object.keys(model.description).find((code) => code.split('-')[0] === language)
	const used = found ?? 'en-US'
	return { text: model.description[used], locale: used }
}

/** Whether the model asks for an app version newer than the one the site hands out today. */
export function needsNewerApp(model: Model, latestVersion: string) {
	if (!model.minAppVersion) return false
	const wanted = model.minAppVersion.split('.').map(Number)
	const latest = latestVersion.split('.').map(Number)
	for (let i = 0; i < 3; i++) if ((wanted[i] ?? 0) !== (latest[i] ?? 0)) return (wanted[i] ?? 0) > (latest[i] ?? 0)
	return false
}

export function formatSize(bytes: number, locale: string) {
	const [value, unit, digits] = bytes >= 1e9 ? [bytes / 1e9, 'gigabyte', 1] : [bytes / 1e6, 'megabyte', 0]
	try {
		return new Intl.NumberFormat(locale, { style: 'unit', unit, maximumFractionDigits: digits }).format(value)
	} catch {
		return `${value.toFixed(digits)} ${unit === 'gigabyte' ? 'GB' : 'MB'}`
	}
}
