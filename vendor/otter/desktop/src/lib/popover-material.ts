// Rich controls live in DOM portals. Leave the OS material visible behind the frontmost
// floating panel even when it opens over an opaque editor or preference sheet.
export function mountPopoverMaterial() {
	const media = matchMedia('(prefers-reduced-transparency: reduce), (forced-colors: active)')
	const surfaces = new Map<HTMLElement, string>()
	let frame = 0
	let panel: HTMLElement | null = null
	let wrapper: HTMLElement | null = null

	function clear() {
		for (const [surface, previous] of surfaces) surface.style.clipPath = previous
		surfaces.clear()
	}

	function paint() {
		clear()
		if (!panel || !wrapper || media.matches || !panel.isConnected) return
		const rect = panel.getBoundingClientRect()
		if (!rect.width || !rect.height) return
		const radius = Math.min(parseFloat(getComputedStyle(panel).borderTopLeftRadius) || 0, rect.width / 2, rect.height / 2)
		for (const node of document.body.children) {
			if (node === wrapper) break
			if (!(node instanceof HTMLElement) || !node.matches('#root,.preferences-panel,[role="dialog"],[data-radix-popper-content-wrapper]')) continue
			const box = node.getBoundingClientRect()
			const x = rect.left - box.left, y = rect.top - box.top
			const r = x + rect.width, b = y + rect.height
			if (r <= 0 || b <= 0 || x >= box.width || y >= box.height) continue
			const hole = `M${x+radius} ${y}H${r-radius}Q${r} ${y} ${r} ${y+radius}V${b-radius}Q${r} ${b} ${r-radius} ${b}H${x+radius}Q${x} ${b} ${x} ${b-radius}V${y+radius}Q${x} ${y} ${x+radius} ${y}Z`
			surfaces.set(node, node.style.clipPath)
			node.style.clipPath = `path(evenodd,"M0 0H${box.width}V${box.height}H0Z ${hole}")`
		}
	}

	function schedule() {
		cancelAnimationFrame(frame)
		frame = requestAnimationFrame(paint)
	}
	const resize = new ResizeObserver(schedule)
	const placement = new MutationObserver(schedule)
	function sync() {
		resize.disconnect()
		placement.disconnect()
		const panels = document.querySelectorAll<HTMLElement>('body > [data-radix-popper-content-wrapper] > [data-native-float]')
		panel = panels.item(panels.length - 1)
		wrapper = panel?.parentElement ?? null
		if (panel && wrapper) {
			resize.observe(panel)
			placement.observe(wrapper, { attributes:true, attributeFilter:['style'] })
		}
		schedule()
	}
	const portals = new MutationObserver(sync)
	portals.observe(document.body, { childList:true })
	document.addEventListener('animationend', schedule)
	window.addEventListener('resize', schedule)
	media.addEventListener('change', schedule)
	sync()
	return () => {
		portals.disconnect()
		resize.disconnect()
		placement.disconnect()
		document.removeEventListener('animationend', schedule)
		window.removeEventListener('resize', schedule)
		media.removeEventListener('change', schedule)
		cancelAnimationFrame(frame)
		clear()
	}
}
