import '@testing-library/jest-dom/vitest'
import { cleanup, render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach } from 'vitest'

afterEach(cleanup)

// jsdom has no layout; the site's scroll-to-top hook calls this on every route change.
window.scrollTo = () => {}

/** Renders a component that uses router links, at `path`. */
export function renderInRouter(ui: ReactElement, path = '/') {
	return render(<MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>)
}
