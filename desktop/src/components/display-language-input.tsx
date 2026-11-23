import { useMemo, useState } from 'react'
import { m } from '~/paraglide/messages.js'
import { getLocale } from '~/paraglide/runtime.js'
import { getLocalizedLanguageName, supportedLanguages } from '~/lib/i18n'
import { LanguageCombobox, matchesQuery, type LanguageGroup, type LanguageOption } from '~/components/language-combobox'

/** Pinned to the top of the list, in this order: English, Taiwan, then the common Asian locales. */
const POPULAR = ['en-US', 'zh-TW', 'ja-JP', 'ko-KR', 'zh-HK', 'zh-CN', 'vi-VN', 'hi-IN']

/** "spanish (ES)" → "spanish", so the flag map can find it. */
function baseName(name: string) {
	return name.replace(/\s*\([^)]*\)$/, '').trim()
}

/**
 * Picker for the app's own UI language. Same control as the transcription language selector —
 * globe pill, type-to-search, flags — over the locales we actually ship translations for.
 */
export function DisplayLanguageInput({ value, onSelect, className }: { value: string; onSelect: (code: string) => void; className?: string }) {
	const [query, setQuery] = useState('')
	const selected = supportedLanguages[value] ? value : 'en-US'

	const entries = useMemo<LanguageOption[]>(() => {
		// Each language is listed in its own words ("עברית", "Français") the way macOS does it,
		// with the english name kept as a search term.
		const endonym = (code: string) => {
			try {
				return new Intl.DisplayNames([code], { type: 'language' }).of(code) ?? code
			} catch {
				return code
			}
		}
		return Object.entries(supportedLanguages)
			.map(([code, name]) => ({
				code,
				label: code === 'zh-TW' ? '繁體中文（台灣）' : code === getLocale() ? getLocalizedLanguageName(name) : endonym(code),
				keywords: code === 'zh-TW' ? [name, '臺灣', 'Taiwan', 'Traditional Chinese'] : [name, endonym(code)],
				flagCode: code === 'zh-TW' ? code : code.split('-')[0],
				flagName: baseName(name),
			}))
			.sort((a, b) => a.label.localeCompare(b.label))
	}, [])

	const needle = query.trim().toLowerCase()
	// Same layout as the transcription picker: a pinned "Popular" group, then the rest A–Z.
	// Searching flattens it into one list of matches.
	const groups = useMemo<LanguageGroup[]>(() => {
		if (needle) return [{ label: null, items: entries.filter((entry) => matchesQuery(entry, needle)) }]
		const popular = POPULAR.flatMap((code) => entries.filter((entry) => entry.code === code))
		const others = entries.filter((entry) => !POPULAR.includes(entry.code))
		return [
			{ label: m.popular(), items: popular },
			{ label: m.others(), items: others },
		].filter((group) => group.items.length)
	}, [entries, needle])

	const triggerLabel = entries.find((entry) => entry.code === selected)?.label ?? m.selectLanguage()

	return (
		<LanguageCombobox
			className={className}
			value={selected}
			onSelect={onSelect}
			groups={groups}
			query={query}
			onQueryChange={setQuery}
			triggerLabel={triggerLabel}
			ariaLabel={m.displayLanguage()}
		/>
	)
}
