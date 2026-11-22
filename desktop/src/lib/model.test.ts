import { describe, expect, it } from 'vitest'
import { supportsLanguage, TAIWAN_TRADITIONAL, transcriptionLanguages, withoutUnsupportedOptions, type ModelCapabilities } from './model'

const whisper: ModelCapabilities = {
	engine: 'whisper',
	requires_vad: false,
	languages: ['en'],
	language_detection: true,
	streaming: true,
	translation: true,
	timestamps: true,
	text_prompts: true,
}

const options = { lang: 'en', init_prompt: 'Punctuate. Use full sentences.', translate: true, n_threads: 4 }

describe('withoutUnsupportedOptions', () => {
	it('sends everything to a model that takes prompts and translation', () => {
		expect(withoutUnsupportedOptions(options, whisper)).toEqual(options)
	})

	it('drops the prompt and translation for engines that reject them, keeping the rest', () => {
		expect(withoutUnsupportedOptions(options, { ...whisper, engine: 'parakeet', text_prompts: false, translation: false })).toEqual({
			lang: 'en',
			n_threads: 4,
		})
	})

	it('leaves the options alone when no capabilities are known yet', () => {
		expect(withoutUnsupportedOptions(options, null)).toEqual(options)
		expect(withoutUnsupportedOptions(options, undefined)).toBe(options)
	})
})

describe('transcriptionLanguages', () => {
	it('offers Traditional Chinese (Taiwan) right after Chinese', () => {
		expect(transcriptionLanguages(['en', 'zh', 'ja'])).toEqual(['en', 'zh', TAIWAN_TRADITIONAL, 'ja'])
	})

	it('adds nothing for a model without Chinese', () => {
		expect(transcriptionLanguages(['en', 'ja'])).toEqual(['en', 'ja'])
	})

	it('does not add it twice', () => {
		expect(transcriptionLanguages(['zh', TAIWAN_TRADITIONAL])).toEqual(['zh', TAIWAN_TRADITIONAL])
	})
})

describe('supportsLanguage', () => {
	const chinese = { ...whisper, languages: ['en', 'zh'] }

	it('keeps Traditional Chinese (Taiwan) on a model that transcribes Chinese', () => {
		expect(supportsLanguage(TAIWAN_TRADITIONAL, chinese)).toBe(true)
	})

	it('drops it on a model without Chinese', () => {
		expect(supportsLanguage(TAIWAN_TRADITIONAL, whisper)).toBe(false)
	})

	it('accepts auto only with language detection', () => {
		expect(supportsLanguage('auto', whisper)).toBe(true)
		expect(supportsLanguage('auto', { ...whisper, language_detection: false })).toBe(false)
	})
})
