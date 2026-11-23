/** @vitest-environment jsdom */
import { expect, it } from 'vitest'
import { renderInRouter } from '~/test/render'
import { getLocale } from '../paraglide/runtime.js'
import Layout from './Layout'

it('sets the page language on <html>, so CJK line breaking and screen readers follow it', () => {
	renderInRouter(<Layout />)
	expect(document.documentElement.lang).toBe(getLocale())
})
