/** @vitest-environment jsdom */
import { screen } from '@testing-library/react'
import { render } from '@testing-library/react'
import { expect, it } from 'vitest'
import './test/render'
import App from './App'
import { m } from './paraglide/messages.js'

it('sends an unknown path such as /features to the home page', async () => {
	window.history.pushState({}, '', '/otter/features')
	render(<App />)
	expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(m.title())
	expect(window.location.pathname).toMatch(/^\/otter\/?$/)
})
