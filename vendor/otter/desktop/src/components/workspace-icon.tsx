import atlas from '~/assets/workspace-icons.png'

const symbols = ['file', 'microphone', 'link', 'upload', 'sidebar', 'settings', 'language', 'options', 'add', 'close', 'stop', 'model', 'next', 'search', 'more', 'download'] as const

export default function WorkspaceIcon({ name, className = 'size-5' }: { name: typeof symbols[number]; className?: string }) {
	const cell = symbols.indexOf(name)
	return (
		<span aria-hidden="true" className={`inline-block shrink-0 bg-current ${className}`}
			style={{ maskImage: `url(${atlas})`, maskSize: '400% 400%', maskPosition: `${(cell % 4) * 100 / 3}% ${Math.floor(cell / 4) * 100 / 3}%` }} />
	)
}
