import { ItemView, WorkspaceLeaf } from 'obsidian';
import {
	CHORD_TYPES,
	NOTES_SHARP,
	NOTES_FLAT,
	getNotesForRoot,
	parseChord,
	ParsedChord,
} from './chords';

export const CHORD_DICT_VIEW = 'chord-dictionary-view';

const ALL_ROOTS = [
	{ label: 'C',  index: 0  },
	{ label: 'C♯', index: 1  },
	{ label: 'D♭', index: 1  },
	{ label: 'D',  index: 2  },
	{ label: 'D♯', index: 3  },
	{ label: 'E♭', index: 3  },
	{ label: 'E',  index: 4  },
	{ label: 'F',  index: 5  },
	{ label: 'F♯', index: 6  },
	{ label: 'G♭', index: 6  },
	{ label: 'G',  index: 7  },
	{ label: 'G♯', index: 8  },
	{ label: 'A♭', index: 8  },
	{ label: 'A',  index: 9  },
	{ label: 'A♯', index: 10 },
	{ label: 'B♭', index: 10 },
	{ label: 'B',  index: 11 },
];

export class ChordDictionaryView extends ItemView {
	private searchQuery = '';
	private browseRootIndex: number | null = null;

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getViewType() { return CHORD_DICT_VIEW; }
	getDisplayText() { return 'Chord dictionary'; }
	getIcon() { return 'book-open'; }

	async onOpen() { this.render(); }
	async onClose() { this.contentEl.empty(); }

	private render() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('mm-chord-dict-view');

		this.renderSearch(contentEl);

		if (this.searchQuery.trim()) {
			this.renderSearchResult(contentEl);
		} else {
			this.renderBrowser(contentEl);
		}
	}

	private renderSearch(parent: HTMLElement) {
		const wrap = parent.createDiv('mm-search-wrap');
		const input = wrap.createEl('input', {
			type: 'text',
			placeholder: 'Search chord (e.g. Cm7, F♯maj7, Bbsus4…)',
			cls: 'mm-search-input',
		});
		input.value = this.searchQuery;
		input.addEventListener('input', () => {
			this.searchQuery = input.value;
			this.browseRootIndex = null;
			this.render();
			// Restore focus and cursor
			const next = this.contentEl.querySelector('.mm-search-input') as HTMLInputElement;
			if (next) { next.focus(); next.setSelectionRange(input.value.length, input.value.length); }
		});
	}

	private renderSearchResult(parent: HTMLElement) {
		const chord = parseChord(this.searchQuery);
		if (!chord) {
			parent.createEl('p', { text: 'No chord matched. Try "cm", "gmaj7", "bbdim"…', cls: 'mm-hint' });
			return;
		}
		this.renderChordCard(parent, chord);
	}

	private renderBrowser(parent: HTMLElement) {
		// Root selector
		const rootWrap = parent.createDiv('mm-root-grid');
		ALL_ROOTS.forEach(r => {
			const btn = rootWrap.createEl('button', {
				text: r.label,
				cls: `mm-root-btn${this.browseRootIndex === r.index ? ' mm-active' : ''}`,
			});
			btn.addEventListener('click', () => {
				this.browseRootIndex = this.browseRootIndex === r.index ? null : r.index;
				this.render();
			});
		});

		if (this.browseRootIndex === null) {
			parent.createEl('p', { text: 'Select a root note to browse chords', cls: 'mm-hint' });
			return;
		}

		const ri = this.browseRootIndex;
		const useFlats = [1, 3, 8, 10].includes(ri);
		const rootName = (useFlats ? NOTES_FLAT : NOTES_SHARP)[ri] as string;

		const list = parent.createDiv('mm-chord-list');
		CHORD_TYPES.forEach(type => {
			const notes = getNotesForRoot(ri, type);
			const card: ParsedChord = { root: rootName, rootIndex: ri, type, notes };
			this.renderChordCard(list, card);
		});
	}

	private renderChordCard(parent: HTMLElement, chord: ParsedChord) {
		const card = parent.createDiv('mm-chord-card');

		const header = card.createDiv('mm-chord-header');
		header.createEl('span', {
			text: chord.root + chord.type.symbol,
			cls: 'mm-chord-name',
		});
		header.createEl('span', {
			text: chord.type.name,
			cls: 'mm-chord-type',
		});

		const notesRow = card.createDiv('mm-notes-row');
		chord.notes.forEach((note, i) => {
			const cell = notesRow.createDiv('mm-note-cell');
			cell.createDiv({ text: note, cls: 'mm-note' });
			cell.createDiv({ text: chord.type.intervalNames[i], cls: 'mm-interval' });
		});
	}
}
