import { m } from '../paraglide/messages.js'
import { Link } from 'react-router-dom'
import Github from '~/icons/Github'
import Logo from '~/icons/Logo'
import { REPO_URL } from '~/lib/links'

interface FooterProps {
	onOpenPrivacyPolicy: () => void
}

const linkClass = 'text-sm text-start text-muted-foreground transition-colors hover:text-foreground'

export default function Footer({ onOpenPrivacyPolicy }: FooterProps) {
	return (
		<footer className="mt-24 border-t border-border bg-card">
			<div className="site-container flex flex-col gap-10 py-12 md:flex-row md:items-start md:justify-between md:gap-16">
				<div className="flex flex-col items-start gap-3">
					<Link to="/" className="flex items-center gap-2 text-foreground transition-opacity hover:opacity-80">
						<Logo className="size-5" />
						<span className="text-[15px] font-bold tracking-[-0.03em]">Otter</span>
					</Link>
					<p className="max-w-[40ch] text-start text-sm text-muted-foreground">{m['footer-description']()}</p>
					<p className="mt-2 text-xs text-muted-foreground" dir="ltr">
						© {new Date().getFullYear()} Otter
					</p>
				</div>
				<nav className="flex flex-wrap gap-x-12 gap-y-4 md:gap-x-16">
					<div className="flex flex-col items-start gap-3">
						<Link className={linkClass} to="/">
							{m.home()}
						</Link>
						<Link className={linkClass} to="/models">
							{m.models()}
						</Link>
						<Link className={linkClass} to="/docs">
							{m.documentation()}
						</Link>
						<Link className={linkClass} to="/changelog">
							{m.changelog()}
						</Link>
					</div>
					<div className="flex flex-col items-start gap-3">
						<button className={linkClass} onClick={onOpenPrivacyPolicy}>
							{m['privacy-policy']()}
						</button>
						<a className={`${linkClass} inline-flex items-center gap-1.5`} href={REPO_URL} target="_blank" rel="noreferrer">
							<Github width="14" height="14" />
							GitHub
						</a>
					</div>
				</nav>
			</div>
		</footer>
	)
}
