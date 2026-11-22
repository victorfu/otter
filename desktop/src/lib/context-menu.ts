/**
 * The webview's built-in right-click menu (Back, Refresh, Save as, Print, Inspect) is a debugging
 * aid, not part of the app. Hide it in production builds and keep it in development. Menus the app
 * draws itself still open: this only stops the webview's default.
 */
export function blockNativeContextMenu(isDev: boolean, target: Document = document): () => void {
	if (isDev) return () => {}
	const prevent = (event: Event) => event.preventDefault()
	target.addEventListener('contextmenu', prevent)
	return () => target.removeEventListener('contextmenu', prevent)
}
