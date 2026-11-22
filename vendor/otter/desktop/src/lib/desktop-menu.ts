import { LogicalPosition } from '@tauri-apps/api/dpi'
import { Menu, type MenuItemOptions } from '@tauri-apps/api/menu'

export function isNativeDesktop() {
	return '__TAURI_INTERNALS__' in window && !('__otterMockTauriRuntime__' in globalThis)
}

export async function popupMenu(items: MenuItemOptions[], x: number, y: number) {
	const menu = await Menu.new({ items })
	try {
		await menu.popup(new LogicalPosition(x, y))
	} finally {
		await menu.close()
	}
}
