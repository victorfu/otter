import { m } from '../paraglide/messages.js'
import { Link } from 'react-router-dom'
import { Button } from '~/components/ui/button'
import Logo from '~/icons/Logo'
import { DOWNLOAD_URL } from '~/lib/links'
import type { Locale } from '../paraglide/runtime.js'
import LanguageSelector from './LanguageSelector'

interface NavProps {
	locale: Locale
	availableLocales: readonly Locale[]
	onLocaleChange: (locale: Locale) => void
}

const linkClass = 'rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'

/** The app's title bar, as a site header: glyph and wordmark, a few links, the language, Download. */
export default function Nav({ locale, availableLocales, onLocaleChange }: NavProps) {
	return (
		<header className="sticky top-0 z-50 border-b border-border bg-card/85 backdrop-blur-xl">
			<div className="site-container flex h-14 items-center gap-4">
				<Link to="/" aria-label={m.home()} className="flex items-center gap-2 text-foreground transition-opacity hover:opacity-80">
					<Logo className="size-6" />
					<span className="text-[17px] font-bold tracking-[-0.03em]">Otter</span>
				</Link>
				<nav className="hidden items-center sm:flex">
					<Link to="/models" className={linkClass}>
						{m.models()}
					</Link>
					<Link to="/docs" className={linkClass}>
						{m.documentation()}
					</Link>
				</nav>
				<ul className="ms-auto flex items-center gap-2">
					<LanguageSelector locale={locale} availableLocales={availableLocales} onLocaleChange={onLocaleChange} />
					<li>
						<Button size="sm" asChild>
							<a href={DOWNLOAD_URL}>{m.download()}</a>
						</Button>
					</li>
				</ul>
			</div>
		</header>
	)
}
