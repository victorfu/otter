/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import './test/render'
import App from './App'

it('re-renders the page body in the language picked from the menu', async () => {
	window.history.pushState({}, '', '/otter/')
	render(<App />)
	expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Tell Otter your terms.')
	fireEvent.click(screen.getByRole('button', { name: 'Language' }))
	fireEvent.click(screen.getByRole('button', { name: '繁體中文（台灣）' }))
	expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('先告訴 Otter 你的術語')
})
