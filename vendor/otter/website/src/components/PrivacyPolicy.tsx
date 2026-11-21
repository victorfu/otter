import { Dialog, DialogContent } from '~/components/ui/dialog'
import DocViewer from './DocViewer'
import policy from '../../../docs/PRIVACY_POLICY.md?raw'

interface PrivacyPolicyProps {
	open: boolean
	onOpenChange: (open: boolean) => void
}

export default function PrivacyPolicy({ open, onOpenChange }: PrivacyPolicyProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				showCloseButton={false}
				className="m-0 !h-[80vh] !w-[95vw] !max-w-[880px] overflow-auto rounded-2xl border border-border !p-6 sm:!h-[96vh] sm:!w-[75vw]">
				<DocViewer content={policy} />
			</DialogContent>
		</Dialog>
	)
}
