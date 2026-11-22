import { ReactNode, useLayoutEffect, useRef, useState } from 'react'
import { Title } from '@radix-ui/react-dialog'
import { m } from '~/paraglide/messages.js'
import {
	ArrowLeft,
	ArrowUpRight,
	Bot,
	Cpu,
	Globe,
	Keyboard,
	Mic,
	ShieldCheck,
	SlidersHorizontal,
	Sparkles,
	Terminal,
	Wrench,
} from 'lucide-react'
import { openUrl } from '@tauri-apps/plugin-opener'
import * as config from '~/lib/config'
import { ModifyState } from '~/lib/types'
import { viewModel } from './view-model'
import { Button } from '~/components/ui/button'
import { AdvancedSection } from './sections/advanced'
import { AutoExportSection } from './sections/auto-export'
import { ApiSection } from './sections/api'
import { DictationSection } from './sections/dictation'
import { GeneralSection } from './sections/general'
import { ModelCatalogSection } from './sections/model-catalog'
import { ModelsSection } from './sections/models'
import { PrivacySection } from './sections/privacy'
import { RecordingSection } from './sections/recording'
import { AiSection, type AiTaskId } from './sections/ai'
import { AiPromptSection } from './sections/ai-prompt'
import { TranscriptionSection } from './sections/transcription'
import { TuningSection } from './sections/tuning'
import { WhisperOptionsSection } from './sections/whisper-options'
import { AudioProcessingSection } from './sections/audio-processing'

interface SettingsPageProps {
	setVisible: ModifyState<boolean>
	scrollTo?: string
}

type SectionId = 'general' | 'transcription' | 'models' | 'ai' | 'tuning' | 'recording' | 'dictation' | 'api' | 'privacy' | 'advanced'

type Subpage = 'model-catalog' | 'auto-export' | 'ai-summary' | 'ai-dictation' | 'whisper-options' | 'audio-processing'

interface SettingsSection {
	id: SectionId
	label: string
	icon: ReactNode
}

type SettingsGroup = { label: string; sections: SettingsSection[] }

export default function SettingsPage({ setVisible, scrollTo }: SettingsPageProps) {
	const vm = viewModel()
	const groups: SettingsGroup[] = [
		{ label: m.settingsInputGroup(), sections: [
			{ id: 'recording', label: m.recordingSettings(), icon: <Mic /> },
			{ id: 'dictation', label: m.navDictation(), icon: <Keyboard /> },
		] },
		{ label: m.settingsOutputGroup(), sections: [
			{ id: 'transcription', label: m.transcription(), icon: <SlidersHorizontal /> },
		] },
		{ label: m.settingsModelsGroup(), sections: [
			{ id: 'models', label: m.navModels(), icon: <Bot /> },
			{ id: 'tuning', label: m.navTuning(), icon: <Cpu /> },
			{ id: 'ai', label: m.aiSection(), icon: <Sparkles /> },
		] },
		{ label: m.settingsAppGroup(), sections: [
			{ id: 'general', label: m.general(), icon: <Globe /> },
			{ id: 'privacy', label: m.privacy(), icon: <ShieldCheck /> },
			{ id: 'api', label: m.navAgents(), icon: <Terminal /> },
			{ id: 'advanced', label: m.advanced(), icon: <Wrench /> },
		] },
	]
	const sections = groups.flatMap(group => group.sections)

	// Pages under a section, each with its own title and a way back; no dialog over the modal.
	const subpages: Record<Subpage, { section: SectionId; title: string }> = {
		'whisper-options': { section: 'tuning', title: m.whisperOptions() },
		'audio-processing': { section: 'tuning', title: m.audioProcessing() },
		'model-catalog': { section: 'models', title: m.modelCatalogTitle() },
		'auto-export': { section: 'transcription', title: m.autoExport() },
		'ai-summary': { section: 'ai', title: m.aiSummaryTask() },
		'ai-dictation': { section: 'ai', title: m.aiDictationTask() },
	}
	const isSubpage = (value: string | undefined): value is Subpage => value !== undefined && value in subpages
	const [activeSection, setActiveSection] = useState<SectionId>(
		isSubpage(scrollTo) ? subpages[scrollTo].section : sections.find(section => section.id === scrollTo)?.id ?? 'general',
	)
	const [subpage, setSubpage] = useState<Subpage | null>(isSubpage(scrollTo) ? scrollTo : null)
	const [focusModelDownload, setFocusModelDownload] = useState(false)
	const [headerSlot, setHeaderSlot] = useState<HTMLDivElement | null>(null)
	const scrollArea = useRef<HTMLDivElement>(null)
	const heading = useRef<HTMLHeadingElement>(null)
	const activeGroup = groups.find(group => group.sections.some(section => section.id === activeSection))!
	const sectionName = sections.find(section => section.id === activeSection)?.label
	const title = subpage ? subpages[subpage].title : sectionName ?? m.settings()

	useLayoutEffect(() => {
		scrollArea.current?.scrollTo(0, 0)
		heading.current?.focus({ preventScroll: true })
	}, [activeSection, subpage])

	function goTo(section: SectionId) {
		setSubpage(null)
		setActiveSection(section)
	}
	function openSubpage(page: Subpage) {
		setActiveSection(subpages[page].section)
		setSubpage(page)
	}
	const openPrompt = (task: AiTaskId) => openSubpage(task === 'summary' ? 'ai-summary' : 'ai-dictation')

	return (
		<div className="settings-workspace">
			<header className="settings-bar">
				<Button variant="ghost" onClick={() => setVisible(false)}>
					<ArrowLeft className="size-4 rtl:rotate-180" />{m.backToWorkspace()}
				</Button>
				<button className="settings-version" title={m.whatsNew()} onClick={() => openUrl(config.changelogURL(vm.appVersionNumber))}>
					{vm.appVersion}<ArrowUpRight className="size-3" />
				</button>
			</header>
			<nav className="preference-tabs" aria-label={m.settings()}>
				{groups.map(group => (
					<button key={group.sections[0].id} type="button" aria-current={group === activeGroup ? 'page' : undefined}
						onClick={() => goTo(group.sections[0].id)}>
						{group.sections[0].icon}<span>{group.label}</span>
					</button>
				))}
			</nav>
			<div ref={scrollArea} className="settings-scroll">
				<div className="settings-sheet">
					{activeGroup.sections.length > 1 && <nav className="preference-segments" aria-label={activeGroup.label}>
						{activeGroup.sections.map(section => <button type="button" key={section.id} aria-current={section.id === activeSection ? 'page' : undefined}
							onClick={() => goTo(section.id)}>{section.label}</button>)}
					</nav>}
					<div className="settings-title">
						{subpage && <Button variant="ghost" size="iconSm" aria-label={m.back()} onClick={() => setSubpage(null)}><ArrowLeft /></Button>}
						<Title ref={heading} tabIndex={-1}>{title}</Title>
						<div ref={setHeaderSlot} className="ms-auto" />
					</div>
					<div className="settings-fields" data-models={activeGroup === groups[2] || undefined}>
						{subpage === 'whisper-options' && <WhisperOptionsSection vm={vm} />}
						{subpage === 'audio-processing' && <AudioProcessingSection vm={vm} />}
						{subpage === 'auto-export' && <AutoExportSection vm={vm} />}
						{subpage === 'ai-summary' && <AiPromptSection vm={vm} task="summary" />}
						{subpage === 'ai-dictation' && <AiPromptSection vm={vm} task="dictation" />}
						{!subpage && activeSection === 'general' && <GeneralSection vm={vm} />}

						{!subpage && activeSection === 'transcription' && (
							<TranscriptionSection vm={vm} onOpenAutoExport={() => openSubpage('auto-export')} />
						)}

						{subpage === 'model-catalog' && (
							<ModelCatalogSection
								vm={vm}
								headerSlot={headerSlot}
								onAddModel={() => {
									setFocusModelDownload(true)
									setSubpage(null)
								}}
							/>
						)}
						{!subpage && activeSection === 'models' && (
							<ModelsSection
								vm={vm}
								onOpenCatalog={() => openSubpage('model-catalog')}
								focusDownload={focusModelDownload}
								onDownloadFocused={() => setFocusModelDownload(false)}
							/>
						)}

						{!subpage && activeSection === 'ai' && <AiSection vm={vm} onOpenPrompt={openPrompt} />}

						{!subpage && activeSection === 'tuning' && (
							<TuningSection
								vm={vm}
								onOpenWhisper={() => openSubpage('whisper-options')}
								onOpenAudio={() => openSubpage('audio-processing')}
							/>
						)}

						{!subpage && activeSection === 'recording' && <RecordingSection />}

						{!subpage && activeSection === 'dictation' && <DictationSection vm={vm} onOpenCleanup={() => openSubpage('ai-dictation')} />}

						{!subpage && activeSection === 'api' && <ApiSection vm={vm} />}

						{!subpage && activeSection === 'privacy' && <PrivacySection vm={vm} />}

						{!subpage && activeSection === 'advanced' && <AdvancedSection vm={vm} />}
					</div>
				</div>
			</div>
		</div>
	)
}
