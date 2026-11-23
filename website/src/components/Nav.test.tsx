/** @vitest-environment jsdom */
import { screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { renderInRouter } from '~/test/render'
import { m } from '../paraglide/messages.js'
import Nav from './Nav'

it('links the nav Download button to the GitHub repository', () => {
	renderInRouter(<Nav locale="en-US" availableLocales={['en-US', 'zh-TW']} onLocaleChange={() => {}} />)
	expect(screen.getByRole('link', { name: m.download() })).toHaveAttribute('href', 'https://github.com/victorfu/otter')
})
