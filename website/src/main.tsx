import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './globals.css'
import App from './App'
import { defineCustomClientStrategy } from './paraglide/runtime.js'
import { detectChineseLocale } from './lib/locale-detect'

// Before the first render: the first getLocale() call fixes the page language.
defineCustomClientStrategy('custom-chinese', {
	getLocale: () => detectChineseLocale(navigator.languages ?? [navigator.language]),
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
