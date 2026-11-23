import { useEffect, useRef, useState } from 'react'
import { Check, Languages } from 'lucide-react'
import { m } from '../paraglide/messages.js'
import type { Locale } from '../paraglide/runtime.js'

/** Chinese is named by script, which `Intl.DisplayNames` leaves out ("中文（台灣）"). */
const LABELS: Partial<Record<Locale, string>> = { 'zh-CN': '简体中文（中国）', 'zh-HK': '繁體中文（香港）', 'zh-TW': '繁體中文（台灣）' }

/**
 * Each language in its own name ("Deutsch", "日本語"), as the app's picker does: the list reads the
 * same on every page language, and a visitor finds theirs without reading the current one.
 */
function nativeName(code: Locale) {
	return LABELS[code] ?? new Intl.DisplayNames([code], { type: 'language' }).of(code) ?? code
}

interface LanguageSelectorProps {
	locale: Locale
	availableLocales: readonly Locale[]
	onLocaleChange: (locale: Locale) => void
	/** Renders a tiny muted "dev" badge next to the trigger. */
	showDevBadge?: boolean
}

export default function LanguageSelector({ locale, availableLocales, onLocaleChange, showDevBadge = false }: LanguageSelectorProps) {
	const [open, setOpen] = useState(false)
	const menuRef = useRef<HTMLLIElement>(null)
	const options = availableLocales.map((code) => ({ code, name: nativeName(code) })).sort((a, b) => a.name.localeCompare(b.name))

	useEffect(() => {
		function closeOnOutsideClick(event: MouseEvent) {
			if (!menuRef.current?.contains(event.target as Node)) setOpen(false)
		}
		document.addEventListener('mousedown', closeOnOutsideClick)
		return () => document.removeEventListener('mousedown', closeOnOutsideClick)
	}, [])

	return (
		<li ref={menuRef} className="relative">
			<button
				type="button"
				aria-label={m.language()}
				aria-expanded={open}
				onClick={() => setOpen((value) => !value)}
				className="inline-flex h-8 items-center justify-center gap-1.5 rounded-full px-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring">
				<Languages aria-hidden="true" className="size-4" />
				{showDevBadge && (
					<span
						dir="ltr"
						className="rounded-full border border-border px-1.5 py-px font-mono text-[9px] leading-[1.4] tracking-[0.08em] text-muted-foreground uppercase">
						dev
					</span>
				)}
			</button>
			{open && (
				<div className="absolute top-full end-0 z-50 mt-2 min-w-52 rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-lg">
					{options.map(({ code, name }) => (
						<button
							key={code}
							type="button"
							onClick={() => {
								onLocaleChange(code)
								setOpen(false)
							}}
							className={`flex w-full items-center justify-between gap-4 whitespace-nowrap rounded-lg px-3 py-2 text-start text-sm transition-colors hover:bg-accent hover:text-foreground ${
								code === locale ? 'text-foreground' : 'text-muted-foreground'
							}`}>
							<span lang={code}>{name}</span>
							{code === locale && <Check aria-hidden="true" className="size-3.5 text-foreground" />}
						</button>
					))}
				</div>
			)}
		</li>
	)
}
