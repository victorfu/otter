import { useRef } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { ModifyState } from '~/lib/types'
import SettingsPage from '~/pages/settings/page'

interface SettingsModalProps {
	visible: boolean
	setVisible: ModifyState<boolean>
	scrollTo?: string
}

export default function SettingsModal({ visible, setVisible, scrollTo }: SettingsModalProps) {
	const opener = useRef(document.activeElement instanceof HTMLElement ? document.activeElement : null)
	return (
		<Dialog.Root open={visible} onOpenChange={setVisible}>
			<Dialog.Portal>
				<Dialog.Content
					aria-describedby={undefined}
					className="fixed inset-0 z-50 bg-background text-foreground"
					onOpenAutoFocus={event => event.preventDefault()}
					onCloseAutoFocus={event => {
						event.preventDefault()
						if (opener.current?.isConnected) opener.current.focus()
					}}>
					<SettingsPage key={scrollTo} setVisible={setVisible} scrollTo={scrollTo} />
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	)
}
