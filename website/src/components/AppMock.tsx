import { Folder, Globe, Link2, Mic, PanelLeft, Settings, SlidersHorizontal, Upload } from 'lucide-react'
import Logo from '~/icons/Logo'

/*
 * Code-drawn mock of the desktop app's idle screen as it is today (top bar, Recents, "New
 * transcription", File / Record / From link, the drop zone). No bitmap, so it stays crisp and
 * follows the page theme through the `--mock-*` tokens. Its labels are the app's English UI on
 * every locale: it depicts the app, it is not page copy.
 */
const recents = [
	{ name: 'Follow-up visit', date: 'Nov 21' },
	{ name: 'Patient education', date: 'Nov 20' },
	{ name: 'Case conference', date: 'Nov 18' },
	{ name: 'Morning rounds', date: 'Nov 17' },
]

const ink = { color: 'var(--mock-ink)' }
const inkMuted = { color: 'var(--mock-ink-muted)' }

export default function AppMock() {
	return (
		<div
			data-app-mock
			dir="ltr"
			aria-hidden="true"
			className="pointer-events-none flex w-full min-w-0 select-none flex-col overflow-hidden rounded-xl border shadow-xl sm:aspect-[16/10]"
			style={{ background: 'var(--mock-surface)', borderColor: 'var(--mock-line)', ...ink }}>
			{/* Top bar: sidebar toggle, Recents, the glyph and wordmark, settings. */}
			<div
				className="flex h-10 shrink-0 items-center gap-3 border-b px-3"
				style={{ background: 'var(--card)', borderColor: 'var(--mock-line)' }}>
				<span className="hidden size-2 rounded-full bg-[#ff5f57] sm:block" />
				<span className="hidden size-2 rounded-full bg-[#febc2e] sm:block" />
				<span className="me-2 hidden size-2 rounded-full bg-[#28c840] sm:block" />
				<PanelLeft className="size-3.5" strokeWidth={1.75} />
				<span className="text-[0.75rem] font-medium">Recents</span>
				<span className="ms-1 flex items-center gap-1.5">
					<Logo className="size-4" />
					<span className="text-[0.8125rem] font-bold tracking-[-0.03em]">Otter</span>
				</span>
				<Settings className="ms-auto size-3.5" strokeWidth={1.75} style={inkMuted} />
			</div>
			<div className="flex min-h-0 flex-1">
				{/* Recents */}
				<div className="hidden w-[11.5rem] shrink-0 flex-col border-e px-3 py-3 sm:flex" style={{ background: 'var(--mock-sidebar)', borderColor: 'var(--mock-line)' }}>
					<div className="mb-2 flex items-center justify-between">
						<span className="text-[0.75rem] font-semibold">Recents</span>
						<span className="font-mono text-[0.625rem]" style={inkMuted}>
							04
						</span>
					</div>
					{recents.map((row) => (
						<span key={row.name} className="flex flex-col gap-0.5 rounded-md px-1.5 py-1.5">
							<span className="text-[0.6875rem]">{row.name}</span>
							<span className="text-[0.5625rem]" style={inkMuted}>
								{row.date}
							</span>
						</span>
					))}
				</div>
				{/* New transcription */}
				<div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-3 px-4 py-8">
					<p className="text-[1.375rem] font-bold tracking-[-0.03em] sm:text-[1.625rem]">New transcription</p>
					<div className="flex items-center gap-1 rounded-lg border p-1" style={{ background: 'var(--card)', borderColor: 'var(--mock-line)' }}>
						<span className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[0.6875rem] font-semibold" style={{ background: 'var(--mock-active)', color: 'var(--mock-accent)' }}>
							<Folder className="size-3" strokeWidth={2} />
							File
						</span>
						<span className="flex items-center gap-1.5 px-2.5 py-1 text-[0.6875rem]">
							<Mic className="size-3" strokeWidth={1.75} />
							Record
						</span>
						<span className="flex items-center gap-1.5 px-2.5 py-1 text-[0.6875rem]">
							<Link2 className="size-3" strokeWidth={1.75} />
							From link
						</span>
					</div>
					<div
						className="flex w-full max-w-[22rem] flex-col items-center gap-1.5 rounded-lg border px-4 py-6"
						style={{ background: 'var(--card)', borderColor: 'var(--mock-line)' }}>
						<span className="flex size-8 items-center justify-center rounded-lg" style={{ background: 'var(--mock-active)', color: 'var(--mock-accent)' }}>
							<Upload className="size-4" strokeWidth={2} />
						</span>
						<span className="text-center text-[0.8125rem] font-semibold">Drop audio, video or a folder here</span>
						<span className="text-[0.625rem]" style={inkMuted}>
							or click to browse your files
						</span>
					</div>
					<div className="flex items-center gap-2">
						<span
							className="flex w-[9rem] items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.6875rem]"
							style={{ background: 'var(--card)', borderColor: 'var(--mock-line)' }}>
							<Globe className="size-3" strokeWidth={1.75} style={inkMuted} />
							English
						</span>
						<span className="flex size-6 items-center justify-center rounded-md border" style={{ background: 'var(--card)', borderColor: 'var(--mock-line)' }}>
							<SlidersHorizontal className="size-3" strokeWidth={1.75} />
						</span>
					</div>
				</div>
			</div>
		</div>
	)
}
