import { useCallback, useEffect, useState } from 'react'
import { getLocale, getTextDirection, setLocale, type Locale } from '../paraglide/runtime.js'
import { supportedWebsiteLocales } from '~/lib/i18n'
import { Outlet } from 'react-router-dom'
import useScrollToTop from '~/lib/useScrollToTop'
import useUrlActions from '~/lib/useUrlActions'
import Footer from './Footer'
import Nav from './Nav'
import PrivacyPolicy from './PrivacyPolicy'

export default function Layout() {
	const [privacyOpen, setPrivacyOpen] = useState(false)
	const [locale, setCurrentLocale] = useState<Locale>(getLocale())
	const direction = getTextDirection(locale)
	const availableLocales = supportedWebsiteLocales as readonly Locale[]
	const onOpenPrivacyPolicy = useCallback(() => setPrivacyOpen(true), [])
	const onLocaleChange = useCallback((nextLocale: Locale) => {
		setLocale(nextLocale, { reload: false })
		setCurrentLocale(nextLocale)
	}, [])

	useEffect(() => {
		document.documentElement.setAttribute('dir', direction)
		document.body.setAttribute('dir', direction)
	}, [direction])

	useScrollToTop()

	useUrlActions({
		'open-privacy-policy': onOpenPrivacyPolicy,
	})

	return (
		<div dir={direction} className="flex min-h-dvh flex-col bg-background text-foreground">
			<Nav locale={locale} availableLocales={availableLocales} onLocaleChange={onLocaleChange} />
			<main className="flex-1">
				<Outlet />
			</main>
			<Footer onOpenPrivacyPolicy={onOpenPrivacyPolicy} />
			<PrivacyPolicy open={privacyOpen} onOpenChange={setPrivacyOpen} />
		</div>
	)
}
