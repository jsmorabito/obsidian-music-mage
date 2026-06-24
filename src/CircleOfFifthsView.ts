import { ItemView, WorkspaceLeaf } from 'obsidian';

export const CIRCLE_OF_FIFTHS_VIEW = 'circle-of-fifths-view';

const KEYS = [
	{ major: 'C',  minor: 'Am',   accidentals: '0'  },
	{ major: 'G',  minor: 'Em',   accidentals: '1♯' },
	{ major: 'D',  minor: 'Bm',   accidentals: '2♯' },
	{ major: 'A',  minor: 'F♯m',  accidentals: '3♯' },
	{ major: 'E',  minor: 'C♯m',  accidentals: '4♯' },
	{ major: 'B',  minor: 'G♯m',  accidentals: '5♯' },
	{ major: 'F♯', minor: 'D♯m',  accidentals: '6♯' },
	{ major: 'D♭', minor: 'B♭m',  accidentals: '5♭' },
	{ major: 'A♭', minor: 'Fm',   accidentals: '4♭' },
	{ major: 'E♭', minor: 'Cm',   accidentals: '3♭' },
	{ major: 'B♭', minor: 'Gm',   accidentals: '2♭' },
	{ major: 'F',  minor: 'Dm',   accidentals: '1♭' },
];

const DIATONIC: Record<string, string[]> = {
	'C':  ['C',  'Dm',  'Em',  'F',  'G',  'Am',  'B°'  ],
	'G':  ['G',  'Am',  'Bm',  'C',  'D',  'Em',  'F♯°' ],
	'D':  ['D',  'Em',  'F♯m', 'G',  'A',  'Bm',  'C♯°' ],
	'A':  ['A',  'Bm',  'C♯m', 'D',  'E',  'F♯m', 'G♯°' ],
	'E':  ['E',  'F♯m', 'G♯m', 'A',  'B',  'C♯m', 'D♯°' ],
	'B':  ['B',  'C♯m', 'D♯m', 'E',  'F♯', 'G♯m', 'A♯°' ],
	'F♯': ['F♯', 'G♯m', 'A♯m', 'B',  'C♯', 'D♯m', 'E♯°' ],
	'D♭': ['D♭', 'E♭m', 'Fm',  'G♭', 'A♭', 'B♭m', 'C°'  ],
	'A♭': ['A♭', 'B♭m', 'Cm',  'D♭', 'E♭', 'Fm',  'G°'  ],
	'E♭': ['E♭', 'Fm',  'Gm',  'A♭', 'B♭', 'Cm',  'D°'  ],
	'B♭': ['B♭', 'Cm',  'Dm',  'E♭', 'F',  'Gm',  'A°'  ],
	'F':  ['F',  'Gm',  'Am',  'B♭', 'C',  'Dm',  'E°'  ],
};

const ROMAN = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];

const NS = 'http://www.w3.org/2000/svg';

export class CircleOfFifthsView extends ItemView {
	private selectedKey: string | null = null;

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getViewType() { return CIRCLE_OF_FIFTHS_VIEW; }
	getDisplayText() { return 'Circle of fifths'; }
	getIcon() { return 'music'; }

	async onOpen() {
		this.render();
	}

	async onClose() {
		this.contentEl.empty();
	}

	private render() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('mm-circle-view');

		contentEl.appendChild(this.buildSVG());

		const infoPanel = contentEl.createDiv('mm-key-info');
		if (this.selectedKey) {
			this.renderKeyInfo(infoPanel, this.selectedKey);
		} else {
			infoPanel.createEl('p', { text: 'Click a key to see details', cls: 'mm-hint' });
		}
	}

	private buildSVG(): SVGSVGElement {
		const size = 400;
		const cx = size / 2;
		const cy = size / 2;
		const outerR = 178;
		const midR = 124;
		const innerR = 76;

		const svg = document.createElementNS(NS, 'svg');
		svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
		svg.setAttribute('class', 'mm-circle-svg');

		KEYS.forEach((key, i) => {
			const angleDeg = i * 30 - 90;
			const startA = (angleDeg - 15) * Math.PI / 180;
			const endA   = (angleDeg + 15) * Math.PI / 180;

			const majorSel = this.selectedKey === key.major;
			const minorSel = this.selectedKey === key.minor;

			const majorPath = this.arcPath(cx, cy, midR, outerR, startA, endA);
			majorPath.setAttribute('class', `mm-seg mm-major${majorSel ? ' mm-selected' : ''}`);
			majorPath.addEventListener('click', () => this.selectKey(key.major));
			svg.appendChild(majorPath);

			const minorPath = this.arcPath(cx, cy, innerR, midR, startA, endA);
			minorPath.setAttribute('class', `mm-seg mm-minor${minorSel ? ' mm-selected' : ''}`);
			minorPath.addEventListener('click', () => this.selectKey(key.minor));
			svg.appendChild(minorPath);

			svg.appendChild(this.label((midR + outerR) / 2, angleDeg, cx, cy, key.major, 'mm-lbl-major'));
			svg.appendChild(this.label((innerR + midR) / 2, angleDeg, cx, cy, key.minor, 'mm-lbl-minor'));
		});

		const center = document.createElementNS(NS, 'circle');
		center.setAttribute('cx', String(cx));
		center.setAttribute('cy', String(cy));
		center.setAttribute('r', String(innerR));
		center.setAttribute('class', 'mm-center');
		svg.appendChild(center);

		return svg;
	}

	private arcPath(cx: number, cy: number, r1: number, r2: number, startA: number, endA: number): SVGPathElement {
		const gap = 0.025;
		const sa = startA + gap;
		const ea = endA - gap;

		const cos = Math.cos, sin = Math.sin;
		const d = [
			`M ${cx + r2 * cos(sa)} ${cy + r2 * sin(sa)}`,
			`A ${r2} ${r2} 0 0 1 ${cx + r2 * cos(ea)} ${cy + r2 * sin(ea)}`,
			`L ${cx + r1 * cos(ea)} ${cy + r1 * sin(ea)}`,
			`A ${r1} ${r1} 0 0 0 ${cx + r1 * cos(sa)} ${cy + r1 * sin(sa)}`,
			'Z',
		].join(' ');

		const path = document.createElementNS(NS, 'path');
		path.setAttribute('d', d);
		return path;
	}

	private label(r: number, angleDeg: number, cx: number, cy: number, text: string, cls: string): SVGTextElement {
		const a = angleDeg * Math.PI / 180;
		const el = document.createElementNS(NS, 'text');
		el.setAttribute('x', String(cx + r * Math.cos(a)));
		el.setAttribute('y', String(cy + r * Math.sin(a)));
		el.setAttribute('text-anchor', 'middle');
		el.setAttribute('dominant-baseline', 'middle');
		el.setAttribute('class', cls);
		el.setAttribute('pointer-events', 'none');
		el.textContent = text;
		return el;
	}

	private selectKey(key: string) {
		this.selectedKey = this.selectedKey === key ? null : key;
		this.render();
	}

	private renderKeyInfo(el: HTMLElement, key: string) {
		const minorKey = KEYS.find(k => k.minor === key);
		const majorKey = KEYS.find(k => k.major === key);
		const keyData = minorKey ?? majorKey;

		el.createEl('h3', {
			text: `${key} ${minorKey ? 'minor' : 'major'}`,
			cls: 'mm-key-title',
		});

		if (keyData) {
			const sig = keyData.accidentals === '0' ? 'No sharps or flats' : keyData.accidentals;
			el.createEl('p', { text: `Key signature: ${sig}`, cls: 'mm-key-sig' });
		}

		const diatonicRoot = minorKey ? minorKey.major : key;
		const chords = DIATONIC[diatonicRoot];
		if (chords) {
			const label = minorKey
				? `Relative major chords (${diatonicRoot})`
				: 'Diatonic chords';
			const wrap = el.createDiv('mm-chords');
			wrap.createEl('h4', { text: label });
			const table = wrap.createEl('table', { cls: 'mm-chord-table' });
			const thead = table.createEl('tr');
			ROMAN.forEach(r => thead.createEl('th', { text: r }));
			const tbody = table.createEl('tr');
			chords.forEach(c => tbody.createEl('td', { text: c }));
		}
	}
}
