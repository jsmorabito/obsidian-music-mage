import { WidgetType } from '@codemirror/view';
import type { EditorView } from '@codemirror/view';
import type { EditorState } from '@codemirror/state';
import type { DirectiveHandler, ParsedDirective } from './directives-api';
import { parseTrackBody } from './TrackParser';
import type { RawTrack, Instrument } from './TrackParser';

function parseAttrs(s: string): Record<string, string> {
	const attrs: Record<string, string> = {};
	for (const m of s.matchAll(/(\w+)=([^\s}]+)/g)) {
		if (m[1] && m[2]) attrs[m[1]] = m[2];
	}
	return attrs;
}

class TrackWidget extends WidgetType {
	constructor(
		private readonly directive: ParsedDirective,
		private readonly raw: RawTrack,
	) { super(); }

	eq(other: TrackWidget): boolean {
		return this.directive.body === other.directive.body
			&& this.directive.label === other.directive.label
			&& JSON.stringify(this.directive.attributes) === JSON.stringify(other.directive.attributes);
	}

	toDOM(view: EditorView): HTMLElement {
		const root = document.createElement('div');
		root.className = 'mm-track-widget';

		// Click-to-edit (required by directives convention)
		root.addEventListener('mousedown', (e: MouseEvent) => {
			e.preventDefault();
			view.dispatch({ selection: { anchor: this.directive.from } });
			view.focus();
		});

		// Header
		const header = root.createDiv('mm-track-header');
		const instrumentLabel = this.raw.instrument === 'guitar' ? 'Guitar' : 'Bass';
		header.createSpan({ text: instrumentLabel.toUpperCase(), cls: 'mm-track-instrument' });
		if (this.raw.label) {
			header.createSpan({ text: this.raw.label, cls: 'mm-track-label' });
		}
		header.createSpan({ text: this.raw.tuning, cls: 'mm-track-tuning' });
		if (this.raw.score !== 'default') {
			header.createSpan({ text: `score: ${this.raw.score}`, cls: 'mm-track-score-tag' });
		}

		const body = root.createDiv('mm-track-body');

		const lines = (this.directive.body ?? '').split('\n').map(l => l.trim()).filter(Boolean);
		const isTab = lines.some(l => /^[A-Ga-g][#b♯♭]?\s*\|/.test(l));

		if (isTab) {
			this.renderTab(body, lines);
		} else {
			this.renderChords(body, lines);
		}

		return root;
	}

	private renderTab(parent: HTMLElement, lines: string[]) {
		const pre = parent.createEl('pre', { cls: 'mm-track-tab' });
		// Colour the string name and fret numbers differently
		for (const line of lines) {
			const match = line.match(/^([A-Ga-g][#b♯♭]?)\s*(\|.+)$/);
			if (!match) { pre.appendText(line + '\n'); continue; }
			const span = pre.createSpan();
			span.createSpan({ text: match[1] ?? '', cls: 'mm-tab-string-name' });
			span.createSpan({ text: match[2] ?? '', cls: 'mm-tab-content' });
			span.appendText('\n');
		}
	}

	private renderChords(parent: HTMLElement, lines: string[]) {
		const row = parent.createDiv('mm-track-chord-row');
		for (const line of lines) {
			if (line.startsWith('//') || line.startsWith('#')) continue;
			for (const barStr of line.split('|')) {
				const tokens = barStr.trim().split(/\s+/).filter(t => t && t !== '.');
				if (tokens.length === 0) continue;
				const bar = row.createDiv('mm-track-bar');
				for (const token of tokens) {
					bar.createSpan({ text: token, cls: 'mm-track-chord' });
				}
			}
		}
	}
}

export function createTrackDirectiveHandler(): DirectiveHandler {
	return {
		name: 'track',

		render(directive: ParsedDirective, _state: EditorState): WidgetType {
			const attrs      = directive.attributes;
			const instrument: Instrument = attrs['instrument'] === 'guitar' ? 'guitar' : 'bass';
			const tuning     = attrs['tuning'] ?? (instrument === 'bass' ? 'EADG' : 'EADGBE');
			const score      = attrs['score'] ?? 'default';
			const label      = directive.label?.trim() ?? '';

			const raw: RawTrack = {
				label,
				score,
				instrument,
				tuning,
				body: directive.body ?? '',
			};

			return new TrackWidget(directive, raw);
		},
	};
}
