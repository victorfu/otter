import { describe, expect, it } from 'vitest'
import { CONFIG_KEYS } from './config-keys'
import { composeSkill, withFrontmatter, type SkillContext } from './skill'

const context: SkillContext = {
	baseUrl: 'http://127.0.0.1:51234',
	serverSkill: '# Server Local Transcription API\n\nBase URL: http://127.0.0.1:51234\n',
	transcriptsFolder: '/Users/me/Documents/Otter',
	configPath: '/Users/me/Library/Application Support/otter/app_config.json',
	dictationShortcut: 'Alt+Space',
	serverBinary: '/Applications/otter.app/Contents/MacOS/server',
	otterBinary: '/Applications/otter.app/Contents/MacOS/otter',
}

describe('composeSkill', () => {
	// A refactor that drops a section is invisible until an agent is missing half its instructions.
	it('keeps every part an agent needs', () => {
		const skill = composeSkill(context)
		expect(skill).toContain('# Server Local Transcription API')
		expect(skill).toContain(context.baseUrl)
		expect(skill).toContain(context.transcriptsFolder!)
		expect(skill).toContain(context.configPath!)
		expect(skill).toContain('transcript.otter.json')
		expect(skill).toContain('"dictation.shortcut": "Alt+Space"')
		expect(skill).toContain('# When invoked without a task')
	})

	// The port is per-run: an agent that cannot find the live one, or the offline route, is stuck.
	it('routes around the dynamic port', () => {
		const skill = composeSkill(context)
		expect(skill).toContain(CONFIG_KEYS.apiBaseUrl)
		expect(skill).toContain('/health')
		expect(skill).toContain(context.serverBinary!)
		expect(skill).toContain(context.otterBinary!)
	})

	it('still names both transcript layouts when the folder cannot be resolved', () => {
		const skill = composeSkill({ ...context, transcriptsFolder: null, configPath: null, serverBinary: null, otterBinary: null })
		expect(skill).toContain('$HOME/Documents/Otter')
		expect(skill).toContain('Settings → API & Agents → Config file')
		expect(skill).toContain('bundles the `server` engine')
	})
})

describe('withFrontmatter', () => {
	it('opens with the frontmatter the agent runtimes index by', () => {
		expect(withFrontmatter(composeSkill(context)).split('\n').slice(0, 4)).toEqual(['---', 'name: otter', expect.stringContaining('description:'), '---'])
	})
})
