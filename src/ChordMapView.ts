import { ItemView, TFile, WorkspaceLeaf } from 'obsidian';
import type MusicMagePlugin from './main';
import { sectionsToPoints, inputToPoints, renderChordMap, renderLegend, renderSymbolLegend, keyToCofPos } from './ChordMap';
import { parseSongDirectives } from './song';
import { metaFromFrontmatter } from './song';

export const CHORD_MAP_VIEW = 'chord-map-view';

type Tab = 'note' | 'input';

export class ChordMapView extends ItemView {
	private activeTab: Tab = 'note';
	private inputValue = '';
	private currentFile: TFile | null = null;

	constructor(leaf: WorkspaceLeaf, private readonly plugin: MusicMagePlugin) {
		super(leaf);
	}

	getViewType()    { return CHORD_MAP_VIEW; }
	getDisplayText() { return 'Chord Map'; }
	getIcon()        { return 'git-fork'; }

	async onOpen() {
		this.registerEvent(
			this.app.workspace.on('active-leaf-change', () => {
				if (this.activeTab === 'note') this.refresh();
			}),
		);
		this.registerEvent(
			this.app.vault.on('modify', (file) => {
				if (this.activeTab === 'note' && file === this.currentFile) this.refresh();
			}),
		);
		await this.refresh();
	}

	async onClose() { this.contentEl.empty(); }

	private async refresh() {
		if (this.activeTab === 'note') {
			const leaf = this.app.workspace.getMostRecentLeaf();
			const file = (leaf?.view as { file?: TFile })?.file ?? null;
			this.currentFile = file instanceof TFile ? file : null;
		}
		this.render();
	}

	private render() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('mm-chord-map-view');

		this.renderTabs(contentEl);

		if (this.activeTab === 'note') {
			this.renderNoteMap(contentEl);
		} else {
			this.renderInputMap(contentEl);
		}
	}

	private renderTabs(parent: HTMLElement) {
		const tabs = parent.createDiv('mm-tab-bar');
		(['note', 'input'] as Tab[]).forEach(tab => {
			const label = tab === 'note' ? 'Active note' : 'Manual input';
			const btn = tabs.createEl('button', {
				text: label,
				cls: `mm-tab${this.activeTab === tab ? ' mm-active' : ''}`,
			});
			btn.addEventListener('click', () => {
				this.activeTab = tab;
				this.render();
			});
		});
	}

	private async renderNoteMap(parent: HTMLElement) {
		if (!this.currentFile) {
			parent.createEl('p', { text: 'Open a note with :::song directives.', cls: 'mm-hint' });
			renderSymbolLegend(parent);
			return;
		}

		const text     = await this.app.vault.cachedRead(this.currentFile);
		const sections = parseSongDirectives(text);
		const cache    = this.app.metadataCache.getFileCache(this.currentFile);
		const meta     = metaFromFrontmatter(cache?.frontmatter ?? null);

		if (sections.length === 0) {
			parent.createEl('p', {
				text: `No :::song directives found in "${this.currentFile.basename}".`,
				cls: 'mm-hint',
			});
			renderSymbolLegend(parent);
			return;
		}

		const points = sectionsToPoints(sections);
		const opts = {
			colorsEnabled: this.plugin.settings.chordMapColorsEnabled,
			sectionColors: this.plugin.settings.sectionColors,
			tonicCofPos:   meta.key ? keyToCofPos(meta.key) : undefined,
		};

		parent.createEl('p', { text: this.currentFile.basename, cls: 'mm-map-file-name' });

		renderChordMap(parent, points, opts);
		renderLegend(parent, sections.map((s, i) => ({ label: s.label, index: i })), opts);
		renderSymbolLegend(parent);
	}

	private renderInputMap(parent: HTMLElement) {
		const inputWrap = parent.createDiv('mm-map-input-wrap');

		const textarea = inputWrap.createEl('textarea', { cls: 'mm-map-textarea' });
		textarea.placeholder = 'Enter chords — same format as :::song body\ne.g. Cmaj7 | Am7 | Fmaj7 | G7';
		textarea.value = this.inputValue;
		textarea.addEventListener('input', () => { this.inputValue = textarea.value; });

		const btn = inputWrap.createEl('button', { text: 'Render', cls: 'mm-map-render-btn' });
		btn.addEventListener('click', () => this.renderFromInput(parent, textarea.value));

		if (this.inputValue.trim()) {
			this.renderFromInput(parent, this.inputValue);
		}

		renderSymbolLegend(parent);
	}

	private renderFromInput(parent: HTMLElement, input: string) {
		parent.querySelector('.mm-chord-map-scroll')?.remove();
		parent.querySelector('.mm-map-legend')?.remove();
		parent.querySelector('.mm-hint')?.remove();

		const points = inputToPoints(input);
		renderChordMap(parent, points, {
			colorsEnabled: false,
			sectionColors: this.plugin.settings.sectionColors,
		});
	}
}
