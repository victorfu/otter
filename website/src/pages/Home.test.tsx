/** @vitest-environment jsdom */
import { screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { renderInRouter } from '~/test/render'
import { m } from '../paraglide/messages.js'
import Home from './Home'

it('leads with the clinical headline and sends every Download to GitHub', () => {
	renderInRouter(<Home />)
	expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Tell Otter your terms. It writes them your way.')
	const downloads = screen.getAllByRole('link', { name: m.download() })
	expect(downloads.length).toBeGreaterThanOrEqual(2) // hero + closing band
	for (const link of downloads) expect(link).toHaveAttribute('href', 'https://github.com/victorfu/otter')
})

it('makes no compliance or accuracy claims', () => {
	const { container } = renderInRouter(<Home />)
	expect(container.textContent).not.toMatch(/HIPAA|complian|certif|\d+\s?%/i)
})

it('keeps the app mock left-to-right on an RTL page', () => {
	const { container } = renderInRouter(
		<div dir="rtl">
			<Home />
		</div>,
	)
	expect(container.querySelector('[data-app-mock]')).toHaveAttribute('dir', 'ltr')
})
