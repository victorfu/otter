import { BookText, Mic, ShieldCheck, Users } from 'lucide-react'
import { m } from '../paraglide/messages.js'
import AppMock from '~/components/AppMock'
import { Button } from '~/components/ui/button'
import Github from '~/icons/Github'
import { DOWNLOAD_URL, REPO_URL } from '~/lib/links'

/**
 * The home page has one job: a clinician sees what Otter is for and downloads it. Every claim
 * here is backed by a shipped feature (the transcription prompt, dictation, recording with speaker
 * labels, local transcription); keep it that way.
 */
const points = [
	{ id: 'terms', icon: BookText, title: m['point-terms-title'], description: m['point-terms-description'] },
	{ id: 'dictate', icon: Mic, title: m['point-dictate-title'], description: m['point-dictate-description'] },
	{ id: 'record', icon: Users, title: m['point-record-title'], description: m['point-record-description'] },
	{ id: 'local', icon: ShieldCheck, title: m['point-local-title'], description: m['point-local-description'] },
]

function DownloadButton() {
	return (
		<Button size="lg" asChild>
			<a href={DOWNLOAD_URL}>{m.download()}</a>
		</Button>
	)
}

export default function Home() {
	return (
		<>
			<section className="site-container pt-16 pb-12 text-center md:pt-24 md:pb-16">
				<p className="text-sm font-semibold text-primary">{m['hero-eyebrow']()}</p>
				<h1 className="mx-auto mt-4 max-w-[20ch] text-[2.25rem] leading-[1.08] font-bold tracking-[-0.035em] text-foreground text-balance [word-break:keep-all] md:text-[3.5rem]">
					{m['hero-title']()}
				</h1>
				<p className="site-lead mx-auto mt-5 max-w-[46ch] text-balance">{m['hero-subtitle']()}</p>
				<div className="mt-8 flex flex-wrap items-center justify-center gap-3">
					<DownloadButton />
					<Button size="lg" variant="outline" asChild>
						<a href={REPO_URL}>
							<Github width="16" height="16" />
							{m['view-on-github']()}
						</a>
					</Button>
				</div>
				<p className="mt-4 text-xs text-muted-foreground" dir="ltr">
					{m['hero-platforms']()}
				</p>
			</section>

			<section className="site-container">
				<div className="mx-auto max-w-[920px]">
					<AppMock />
				</div>
			</section>

			<section className="site-container site-section">
				<ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					{points.map(({ id, icon: Icon, title, description }) => (
						<li key={id} className="rounded-lg border border-border bg-card p-5 shadow-xs">
							<span className="flex size-9 items-center justify-center rounded-md bg-accent text-primary">
								<Icon className="size-[18px]" strokeWidth={1.75} aria-hidden="true" />
							</span>
							<h2 className="mt-4 text-[15px] font-semibold text-foreground">{title()}</h2>
							<p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description()}</p>
						</li>
					))}
				</ul>
			</section>

			<section className="site-container">
				<div className="flex flex-col items-center gap-5 rounded-lg border border-border bg-card px-6 py-12 text-center">
					<h2 className="site-heading">{m['closing-title']()}</h2>
					<DownloadButton />
				</div>
			</section>
		</>
	)
}
