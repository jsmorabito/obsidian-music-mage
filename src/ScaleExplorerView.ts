import { ItemView, WorkspaceLeaf } from 'obsidian';
import { SCALE_TYPES, CATEGORIES, buildScale, ScaleType } from './scales';
import { NOTES_SHARP, NOTES_FLAT } from './chords';

export const SCALE_EXPLORER_VIEW = 'scale-explorer-view';

const ROOTS = [
	{ label: 'C',  index: 0  },
	{ label: 'C♯', index: 1  },
	{ label: 'D♭', index: 1  },
	{ label: 'D',  index: 2  },
	{ label: 'E♭', index: 3  },
	{ label: 'E',  index: 4  },
	{ label: 'F',  index: 5  },
	{ label: 'F♯', index: 6  },
	{ label: 'G♭', index: 6  },
	{ label: 'G',  index: 7  },
	{ label: 'A♭', index: 8  },
	{ label: 'A',  index: 9  },
	{ label: 'B♭', index: 10 },
	{ label: 'B',  index: 11 },
];

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

export class ScaleExplorerView extends ItemView {
	private rootIndex = 0;
	private rootLabel = 'C';
	private selectedScale: ScaleType = SCALE_TYPES[0] as ScaleType;
	private activeCategory = 'Diatonic';

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getViewType() { return SCALE_EXPLORER_VIEW; }
	getDisplayText() { return 'Scale explorer'; }
	getIcon() { return 'layout-list'; }

	async onOpen() { this.render(); }
	async onClose() { this.contentEl.empty(); }

	private render() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('mm-scale-view');

		this.renderRootPicker(contentEl);
		this.renderCategoryTabs(contentEl);
		this.renderScaleList(contentEl);
		this.renderResult(contentEl);
	}

	private renderRootPicker(parent: HTMLElement) {
		const wrap = parent.createDiv('mm-root-grid');
		ROOTS.forEach(r => {
			const btn = wrap.createEl('button', {
				text: r.label,
				cls: `mm-root-btn${this.rootIndex === r.index && this.rootLabel === r.label ? ' mm-active' : ''}`,
			});
			btn.addEventListener('click', () => {
				this.rootIndex = r.index;
				this.rootLabel = r.label;
				this.render();
			});
		});
	}

	private renderCategoryTabs(parent: HTMLElement) {
		const tabs = parent.createDiv('mm-cat-tabs');
		CATEGORIES.forEach(cat => {
			const tab = tabs.createEl('button', {
				text: cat,
				cls: `mm-cat-tab${this.activeCategory === cat ? ' mm-active' : ''}`,
			});
			tab.addEventListener('click', () => {
				this.activeCategory = cat;
				const first = SCALE_TYPES.find(s => s.category === cat);
				if (first) this.selectedScale = first;
				this.render();
			});
		});
	}

	private renderScaleList(parent: HTMLElement) {
		const list = parent.createDiv('mm-scale-list');
		SCALE_TYPES.filter(s => s.category === this.activeCategory).forEach(scale => {
			const btn = list.createEl('button', {
				text: scale.name,
				cls: `mm-scale-btn${this.selectedScale.name === scale.name ? ' mm-active' : ''}`,
			});
			btn.addEventListener('click', () => {
				this.selectedScale = scale;
				this.render();
			});
		});
	}

	private renderResult(parent: HTMLElement) {
		const result = buildScale(this.rootIndex, this.selectedScale);
		const panel = parent.createDiv('mm-scale-result');

		// Title
		panel.createEl('h3', {
			text: `${result.root} ${this.selectedScale.name}`,
			cls: 'mm-scale-title',
		});

		// Notes row with piano-style highlights
		const pianoWrap = panel.createDiv('mm-piano-wrap');
		this.renderPiano(pianoWrap, result.notes, result.root);

		// Note + interval table
		const noteTable = panel.createEl('table', { cls: 'mm-note-table' });
		const degRow = noteTable.createEl('tr');
		const noteRow = noteTable.createEl('tr');
		const itvlRow = noteTable.createEl('tr');

		result.notes.forEach((note, i) => {
			degRow.createEl('th', { text: String(i + 1) });
			noteRow.createEl('td', { text: note, cls: 'mm-note' });
			itvlRow.createEl('td', { text: this.selectedScale.intervalNames[i] ?? '', cls: 'mm-interval' });
		});

		// Diatonic chords
		if (result.diatonicChords.length > 0) {
			panel.createEl('h4', { text: 'Diatonic chords', cls: 'mm-section-label' });
			const chordGrid = panel.createDiv('mm-diatonic-grid');
			result.diatonicChords.forEach((chord, i) => {
				const cell = chordGrid.createDiv('mm-diatonic-cell');
				cell.createDiv({ text: ROMAN[i] ?? '', cls: 'mm-roman' });
				cell.createDiv({ text: chord.name, cls: 'mm-diatonic-chord' });
				cell.createDiv({ text: chord.notes.join(' – '), cls: 'mm-diatonic-notes' });
			});
		}
	}

	private renderPiano(parent: HTMLElement, scaleNotes: string[], root: string) {
		const useFlats = [1, 3, 8, 10].includes(this.rootIndex);
		const noteScale = useFlats ? NOTES_FLAT : NOTES_SHARP;
		const scaleSet = new Set(scaleNotes);

		// Render two octaves starting at C
		const piano = parent.createDiv('mm-piano');
		const startC = 0; // always start from C for visual consistency

		// We'll show one octave (12 keys)
		const WHITE_PATTERN = [0, 2, 4, 5, 7, 9, 11]; // C D E F G A B offsets
		const BLACK_POSITIONS: Record<number, number> = { 1: 0, 3: 1, 6: 3, 8: 4, 10: 5 }; // offset → gap index

		const whiteKeys = piano.createDiv('mm-piano-whites');
		const blackKeys = piano.createDiv('mm-piano-blacks');

		WHITE_PATTERN.forEach((offset, pos) => {
			const noteIndex = (startC + offset) % 12;
			const noteName = noteScale[noteIndex] as string;
			const inScale = scaleSet.has(noteName);
			const isRoot = noteIndex === this.rootIndex;

			const key = whiteKeys.createDiv(
				`mm-key mm-white${inScale ? ' mm-in-scale' : ''}${isRoot ? ' mm-root-key' : ''}`
			);
			if (inScale) key.createDiv({ text: noteName, cls: 'mm-key-label' });
		});

		// Black keys — render as overlay
		Object.entries(BLACK_POSITIONS).forEach(([offsetStr, gapIndex]) => {
			const offset = Number(offsetStr);
			const noteIndex = (startC + offset) % 12;
			const noteName = noteScale[noteIndex] as string;
			const inScale = scaleSet.has(noteName);
			const isRoot = noteIndex === this.rootIndex;

			const key = blackKeys.createDiv(
				`mm-key mm-black${inScale ? ' mm-in-scale' : ''}${isRoot ? ' mm-root-key' : ''}`
			);
			key.style.setProperty('--gap-index', String(gapIndex));
			if (inScale) key.createDiv({ text: noteName, cls: 'mm-key-label' });
		});
	}
}
