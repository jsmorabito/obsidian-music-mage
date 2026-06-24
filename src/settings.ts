import { App, PluginSettingTab, Setting } from 'obsidian';
import type MusicMagePlugin from './main';

export type TrackAlignment = 'bar' | 'beat';

export interface MusicMageSettings {
	chordMapColorsEnabled: boolean;
	sectionColors: string[];
	trackAlignment: TrackAlignment;
}

export const DEFAULT_SECTION_COLORS = [
	'#4f86f7', '#f7774f', '#4ff7a0', '#f7d44f',
	'#c44ff7', '#4ff7f0', '#f74f86', '#7ff74f',
];

export const DEFAULT_SETTINGS: MusicMageSettings = {
	chordMapColorsEnabled: false,
	sectionColors: [...DEFAULT_SECTION_COLORS],
	trackAlignment: 'bar',
};

export class MusicMageSettingTab extends PluginSettingTab {
	constructor(app: App, private readonly plugin: MusicMagePlugin) {
		super(app, plugin);
	}

	display() {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.createEl('h2', { text: 'Music Mage' });

		// ── Chord Map ────────────────────────────────────────
		containerEl.createEl('h3', { text: 'Chord Map' });

		new Setting(containerEl)
			.setName('Section colors')
			.setDesc('Color-code each section in the Chord Map. Off by default.')
			.addToggle(t => t
				.setValue(this.plugin.settings.chordMapColorsEnabled)
				.onChange(async (v) => {
					this.plugin.settings.chordMapColorsEnabled = v;
					await this.plugin.saveSettings();
					this.display();
				}),
			);

		if (this.plugin.settings.chordMapColorsEnabled) {
			this.plugin.settings.sectionColors.forEach((color, i) => {
				new Setting(containerEl)
					.setName(`Section ${i + 1} color`)
					.setDesc(i === 0 ? 'Colors cycle if the song has more sections than colors defined here.' : '')
					.addColorPicker(cp => cp
						.setValue(color)
						.onChange(async (v) => {
							this.plugin.settings.sectionColors[i] = v;
							await this.plugin.saveSettings();
						}),
					);
			});
		}

		// ── Track / Key Detection ─────────────────────────────
		containerEl.createEl('h3', { text: 'Track & Key Detection' });

		new Setting(containerEl)
			.setName('Track beat alignment')
			.setDesc(
				'Bar: pair bass notes and guitar chords that fall in the same | segment — forgiving with spacing. ' +
				'Beat: align by character column — more precise but requires consistent tab formatting.',
			)
			.addDropdown(d => d
				.addOption('bar',  'Bar (default)')
				.addOption('beat', 'Beat (column-precise)')
				.setValue(this.plugin.settings.trackAlignment)
				.onChange(async (v) => {
					this.plugin.settings.trackAlignment = v as TrackAlignment;
					await this.plugin.saveSettings();
				}),
			);
	}
}
