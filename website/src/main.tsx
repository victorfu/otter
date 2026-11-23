import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './globals.css'
import App from './App'
import { defineCustomClientStrategy, locales } from './paraglide/runtime.js'
import { detectSiteLocale } from './lib/locale-detect'

// Before the first render: the first getLocale() call fixes the page language.
defineCustomClientStrategy('custom-language', {
	getLocale: () => detectSiteLocale(navigator.languages ?? [navigator.language], locales),
	setLocale: () => {},
})

const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
function syncThemeWithSystem(isDark: boolean) {
	document.documentElement.classList.toggle('dark', isDark)
	document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
}

syncThemeWithSystem(mediaQuery.matches)
mediaQuery.addEventListener('change', (event) => syncThemeWithSystem(event.matches))

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<App />
	</StrictMode>,
)
