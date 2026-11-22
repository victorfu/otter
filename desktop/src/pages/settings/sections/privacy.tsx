import { m } from '~/paraglide/messages.js'
import SafeMarkdown from '~/components/safe-markdown'
import { Switch } from '~/components/ui/switch'
import policy from '../../../../../docs/PRIVACY_POLICY.md?raw'
import { SettingsGroup, SettingsRow, type SettingsViewModel } from './shared'

export function PrivacySection({ vm }: { vm: SettingsViewModel }) {
	return (
		<div className="space-y-6">
			<SettingsGroup>
				<SettingsRow label={m.analyticsEnabled()} description={!vm.preference.analyticsEnabled ? m.analyticsDisabledWarning() : undefined}>
					<Switch checked={vm.preference.analyticsEnabled} onCheckedChange={vm.preference.setAnalyticsEnabled} />
				</SettingsRow>
				<SettingsRow label={m.saveProjects()} description={m.saveProjectsInfo()}>
					<Switch checked={vm.preference.saveTranscripts} onCheckedChange={vm.preference.setSaveTranscripts} />
				</SettingsRow>
			</SettingsGroup>
			<article aria-label={m.privacyPolicy()} className="prose prose-sm dark:prose-invert max-w-none rounded-xl border border-border/60 bg-card p-5">
				<SafeMarkdown>{policy}</SafeMarkdown>
			</article>
		</div>
	)
}
