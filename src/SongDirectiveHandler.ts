import { WidgetType } from '@codemirror/view';
import type { EditorView } from '@codemirror/view';
import type { EditorState } from '@codemirror/state';
import type { DirectiveHandler, ParsedDirective } from './directives-api';
import { parseChordBody } from './song';

class SongWidget extends WidgetType {
	constructor(
		private readonly directive: ParsedDirective,
		private readonly label: string,
		private readonly bars: string[][],
	) {
		super();
	}

	eq(other: SongWidget): boolean {
		return this.directive.body === other.directive.body
			&& this.directive.label === other.directive.label;
	}

	toDOM(view: EditorView): HTMLElement {
		const root = document.createElement('div');
		root.className = 'mm-song-widget';

		// Required by directives convention — click restores cursor into block
		root.addEventListener('mousedown', (e: MouseEvent) => {
			e.preventDefault();
			view.dispatch({ selection: { anchor: this.directive.from } });
			view.focus();
		});

		const header = root.createDiv('mm-song-widget-header');
		header.createSpan({ text: '♪', cls: 'mm-song-widget-icon' });
		header.createSpan({ text: this.label, cls: 'mm-song-widget-label' });

		if (this.bars.length === 0) {
			root.createDiv({ text: 'No chords yet', cls: 'mm-song-widget-empty' });
			return root;
		}

		const grid = root.createDiv('mm-song-widget-grid');
		this.bars.forEach(bar => {
			const cell = grid.createDiv('mm-song-widget-bar');
			bar.forEach(chord => cell.createSpan({ text: chord, cls: 'mm-song-widget-chord' }));
		});

		return root;
	}
}

export function createSongDirectiveHandler(): DirectiveHandler {
	return {
		name: 'song',

		render(directive: ParsedDirective, _state: EditorState): WidgetType {
			const label = directive.label?.trim() ?? 'Song Section';
			const bars = parseChordBody((directive.body ?? '').split('\n'));
			return new SongWidget(directive, label, bars);
		},

	};
}
