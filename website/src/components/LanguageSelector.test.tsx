/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import '~/test/render'
import type { Locale } from '../paraglide/runtime.js'
import LanguageSelector from './LanguageSelector'

const locales = ['en-US', 'de-DE', 'ja-JP', 'zh-CN', 'zh-HK', 'zh-TW'] as const satisfies readonly Locale[]

function labels(current: Locale) {
	const { unmount } = render(<LanguageSelector locale={current} availableLocales={locales} onLocaleChange={() => {}} />)
	fireEvent.click(screen.getByRole('button', { name: /language|Sprache|言語|語言/i }))
	const names = screen.getAllByRole('button').slice(1).map((button) => button.textContent)
	unmount()
	return names
}

it('names every language in itself, like the app, whatever the page language is', () => {
	const english = labels('en-US')
	expect(english).toEqual(expect.arrayContaining(['Deutsch (Deutschland)', '日本語 (日本)', '简体中文（中国）', '繁體中文（香港）', '繁體中文（台灣）']))
	expect(labels('de-DE')).toEqual(english)
	expect(labels('zh-TW')).toEqual(english)
})
