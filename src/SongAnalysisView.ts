import { ItemView, TFile, WorkspaceLeaf } from 'obsidian';
import type MusicMagePlugin from './main';
import { metaFromFrontmatter, parseSongDirectives, isSongFile, SongMeta, SongSection } from './song';
import { sectionsToPoints, renderChordMap, renderLegend, keyToCofPos } from './ChordMap';
import { buildScoreGroups } from './TrackParser';
import { detectKey, KeyCandidate, ChordInContext } from './theory/keyDetect';

export const SONG_ANALYSIS_VIEW = 'song-analysis-view';

export class SongAnalysisView extends ItemView {
	private currentFile: TFile | null = null;

	constructor(leaf: WorkspaceLeaf, private readonly plugin: MusicMagePlugin) {
		super(leaf);
	}

	getViewType() { return SONG_ANALYSIS_VIEW; }
	getDisplayText() { return 'Song analysis'; }
	getIcon() { return 'file-music'; }

	async onOpen() {
		this.registerEvent(this.app.workspace.on('active-leaf-change', () => void this.refresh()));
		this.registerEvent(this.app.vault.on('modify', (file) => {
			if (file === this.currentFile) void this.refresh();
		}));
		this.registerEvent(this.app.metadataCache.on('changed', (file) => {
			if (file === this.currentFile) void this.refresh();
		}));
		await this.refresh();
	}

	async onClose() { this.contentEl.empty(); }

	private async refresh() {
		const leaf = this.app.workspace.getMostRecentLeaf();
		const file = (leaf?.view as { file?: TFile })?.file ?? null;
		this.currentFile = file instanceof TFile ? file : null;
		await this.render();
	}

	private async render() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('mm-song-view');

		if (!this.currentFile) {
			this.renderEmpty(contentEl, 'Open a note to see song analysis.');
			return;
		}

		const cache = this.app.metadataCache.getFileCache(this.currentFile);
		const frontmatter = cache?.frontmatter ?? null;
		const meta = metaFromFrontmatter(frontmatter);
		if (meta.title === 'Untitled') meta.title = this.currentFile.basename;

		const text = await this.app.vault.cachedRead(this.currentFile);
		const sections = parseSongDirectives(text);

		const { songFrontmatterKey, songFrontmatterValue } = this.plugin.settings;
		if (!isSongFile(meta, sections, frontmatter, songFrontmatterKey, songFrontmatterValue)) {
			this.renderEmpty(contentEl, 'No song data found. Add frontmatter (key, tempo, time) or :::song directives.');
			return;
		}

		this.renderHeader(contentEl, meta);
		this.renderBadges(contentEl, meta);
		if (sections.length > 0) {
			this.renderSections(contentEl, sections);
			this.renderChordMap(contentEl, sections, meta);
		}

		this.renderKeyDetection(contentEl, text);
	}

	private renderEmpty(parent: HTMLElement, msg: string) {
		parent.createDiv('mm-song-empty').createEl('p', { text: msg, cls: 'mm-hint' });
	}

	private renderHeader(parent: HTMLElement, meta: SongMeta) {
		const header = parent.createDiv('mm-song-header');
		header.createEl('h3', { text: meta.title, cls: 'mm-song-title' });
		if (meta.artist) header.createEl('p', { text: meta.artist, cls: 'mm-song-artist' });
		if (meta.genre)  header.createEl('p', { text: meta.genre,  cls: 'mm-song-genre'  });
	}

	private renderBadges(parent: HTMLElement, meta: SongMeta) {
		if (!meta.key && !meta.tempo && !meta.time) return;
		const row = parent.createDiv('mm-badge-row');

		if (meta.key)   { const b = row.createDiv('mm-badge'); b.createSpan({ text: 'KEY',  cls: 'mm-badge-label' }); b.createSpan({ text: meta.key,          cls: 'mm-badge-value' }); }
		if (meta.tempo) { const b = row.createDiv('mm-badge'); b.createSpan({ text: 'BPM',  cls: 'mm-badge-label' }); b.createSpan({ text: String(meta.tempo), cls: 'mm-badge-value' }); }
		if (meta.time)  { const b = row.createDiv('mm-badge'); b.createSpan({ text: 'TIME', cls: 'mm-badge-label' }); b.createSpan({ text: meta.time,          cls: 'mm-badge-value' }); }
	}

	private renderSections(parent: HTMLElement, sections: SongSection[]) {
		const wrap = parent.createDiv('mm-song-sections');
		wrap.createEl('h4', { text: 'Chord progressions', cls: 'mm-section-label' });

		sections.forEach(section => {
			const sec = wrap.createDiv('mm-song-section');
			sec.createDiv({ text: section.label, cls: 'mm-section-name' });
			const grid = sec.createDiv('mm-chord-grid');
			section.bars.forEach(bar => {
				const cell = grid.createDiv('mm-chord-cell');
				bar.forEach(chord => cell.createSpan({ text: chord, cls: 'mm-chord-token' }));
			});
		});
	}

	private renderChordMap(parent: HTMLElement, sections: SongSection[], meta?: SongMeta) {
		const wrap = parent.createDiv('mm-song-map-wrap');
		wrap.createEl('h4', { text: 'Chord map', cls: 'mm-section-label' });

		const opts = {
			colorsEnabled: this.plugin.settings.chordMapColorsEnabled,
			sectionColors: this.plugin.settings.sectionColors,
			compact: true,
			tonicCofPos: meta?.key ? keyToCofPos(meta.key) : undefined,
		};

		const points = sectionsToPoints(sections);
		renderChordMap(wrap, points, opts);
		renderLegend(wrap, sections.map((s, i) => ({ label: s.label, index: i })), opts);
	}

	private renderKeyDetection(parent: HTMLElement, text: string) {
		const groups = buildScoreGroups(text, this.plugin.settings.trackAlignment);
		if (groups.length === 0) return;

		const wrap = parent.createDiv('mm-key-detect-wrap');
		wrap.createEl('h4', { text: 'Key detection', cls: 'mm-section-label' });

		for (const group of groups) {
			if (group.merged.length === 0) continue;

			const section = wrap.createDiv('mm-key-detect-group');
			if (group.scoreId !== 'default') {
				section.createDiv({ text: `Score: ${group.scoreId}`, cls: 'mm-key-detect-score-id' });
			}

			const result = detectKey(group.merged);

			// Candidate bars
			const candWrap = section.createDiv('mm-key-candidates');
			result.candidates.forEach((c, i) => {
				const row = candWrap.createDiv('mm-key-candidate');
				row.createSpan({ text: `${i + 1}.`, cls: 'mm-key-rank' });
				row.createSpan({ text: c.key, cls: 'mm-key-name' });
				const pct = Math.round(c.score * 100);
				row.createSpan({ text: `${pct}%`, cls: 'mm-key-pct' });
				const bar = row.createDiv('mm-key-bar-bg');
				const fill = bar.createDiv('mm-key-bar-fill');
				fill.style.width = `${pct}%`;
				if (i === 0) fill.addClass('mm-key-bar-top');
			});

			// Roman numeral breakdown for top candidate
			const top = result.candidates[0];
			if (top && top.chordBreakdown.length > 0) {
				section.createEl('p', { text: `Best match: ${top.key}`, cls: 'mm-key-best' });
				this.renderChordBreakdown(section, top);
			}

			if (result.dominantBassNote) {
				section.createEl('p', {
					text: `Most frequent bass note: ${result.dominantBassNote}`,
					cls: 'mm-key-bass-note',
				});
			}
		}
	}

	private renderChordBreakdown(parent: HTMLElement, candidate: KeyCandidate) {
		const table = parent.createEl('table', { cls: 'mm-key-breakdown-table' });
		const thead = table.createEl('tr');
		thead.createEl('th', { text: 'Chord' });
		thead.createEl('th', { text: 'Roman' });
		thead.createEl('th', { text: 'Bass' });
		thead.createEl('th', { text: 'Inversion' });

		for (const entry of candidate.chordBreakdown) {
			const row = table.createEl('tr');
			row.createEl('td', { text: entry.chordName, cls: entry.isDiatonic ? '' : 'mm-key-outside' });
			row.createEl('td', { text: entry.roman ?? '—', cls: 'mm-roman' });
			row.createEl('td', { text: entry.bassNote ?? '—' });
			row.createEl('td', { text: formatInversion(entry.inversion) });
		}
	}
}

function formatInversion(inv: ChordInContext['inversion']): string {
	if (!inv) return '—';
	if (inv === 'root')    return 'root pos.';
	if (inv === 'first')   return '1st inv.';
	if (inv === 'second')  return '2nd inv.';
	if (inv === 'outside') return '⚠ outside';
	return '—';
}
