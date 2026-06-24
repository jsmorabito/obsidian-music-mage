import { parseChord } from './chords';
import type { SongSection } from './song';

// Circle of fifths — top to bottom display order
export const COF_LABELS = ['C', 'G', 'D', 'A', 'E', 'B', 'F♯', 'D♭', 'A♭', 'E♭', 'B♭', 'F'];

const COF_POS: Record<string, number> = {
	'C': 0,  'B♯': 0,
	'G': 1,
	'D': 2,
	'A': 3,
	'E': 4,  'F♭': 4,
	'B': 5,  'C♭': 5,
	'F♯': 6, 'G♭': 6,
	'C♯': 7, 'D♭': 7,
	'G♯': 8, 'A♭': 8,
	'D♯': 9, 'E♭': 9,
	'A♯': 10,'B♭': 10,
	'F': 11, 'E♯': 11,
};

export interface ChordPoint {
	root: string;
	cofPos: number;
	isMinor: boolean;
	isDominant7: boolean;
	label: string;
	sectionIndex: number;
	sectionLabel: string;
}

function chordIsMinor(sym: string): boolean {
	return (sym.startsWith('m') && !sym.startsWith('maj'))
		|| sym.includes('dim');
}

/** Dominant 7: major triad + ♭7 (7, 9, 11, 13) — not maj7 / minor */
function chordIsDominant7(sym: string): boolean {
	if (chordIsMinor(sym)) return false;
	if (sym.includes('maj')) return false;
	return /\d/.test(sym); // has a number but no 'maj' prefix — e.g. 7, 9, 7♭5
}

/** Parse a key string like "G major" / "E minor" / "F♯" → CoF row index, or undefined */
export function keyToCofPos(key: string): number | undefined {
	if (!key) return undefined;
	// Strip mode words and extract root
	const root = key.replace(/\s*(major|minor|maj|min|m)\b.*/i, '').trim();
	return COF_POS[root];
}

export function sectionsToPoints(sections: SongSection[]): ChordPoint[] {
	const points: ChordPoint[] = [];

	sections.forEach((section, sectionIndex) => {
		// Deduplicate: find the unique repeating bar pattern for this section.
		// If the section is just one bar-pattern repeated N times, show it once.
		const bars = deduplicateBars(section.bars);

		bars.forEach(bar => {
			bar.forEach(chordStr => {
				const parsed = parseChord(chordStr);
				if (!parsed) return;
				const cofPos = COF_POS[parsed.root];
				if (cofPos === undefined) return;
				points.push({
					root: parsed.root,
					cofPos,
					isMinor:      chordIsMinor(parsed.type.symbol),
					isDominant7:  chordIsDominant7(parsed.type.symbol),
					label: chordStr,
					sectionIndex,
					sectionLabel: section.label,
				});
			});
		});
	});

	return points;
}

/**
 * If bars repeat a pattern (e.g. [D,A,Bm,G] × 4), return just one cycle.
 * Tries pattern lengths 1–half, smallest period wins.
 */
function deduplicateBars(bars: string[][]): string[][] {
	const n = bars.length;
	if (n <= 1) return bars;

	const barKey = (b: string[]) => b.join(',');

	for (let period = 1; period <= Math.floor(n / 2); period++) {
		const pattern = bars.slice(0, period);
		let match = true;
		for (let i = period; i < n; i++) {
			const a = barKey(pattern[i % period] ?? []);
			const b = barKey(bars[i] ?? []);
			if (a !== b) { match = false; break; }
		}
		if (match) return pattern;
	}
	return bars;
}

/** Parse a free-form chord string (same format as :::song body) into points. */
export function inputToPoints(input: string): ChordPoint[] {
	const bars: string[][] = [];
	for (const line of input.split('\n')) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) continue;
		for (const barStr of trimmed.split('|')) {
			const chords = barStr.trim().split(/\s+/).filter(c => c && c !== '.');
			if (chords.length > 0) bars.push(chords);
		}
	}
	const fakeSection: SongSection = { label: 'Input', bars };
	return sectionsToPoints([fakeSection]);
}

export interface ChordMapOptions {
	colorsEnabled: boolean;
	sectionColors: string[];
	compact?: boolean;
	/** CoF row index (0–11) of the tonic — drawn as a highlight band */
	tonicCofPos?: number;
}

const NS = 'http://www.w3.org/2000/svg';

function el<K extends keyof SVGElementTagNameMap>(tag: K): SVGElementTagNameMap[K] {
	return document.createElementNS(NS, tag) as SVGElementTagNameMap[K];
}

export function renderChordMap(
	container: HTMLElement,
	points: ChordPoint[],
	opts: ChordMapOptions,
): void {
	container.empty();

	if (points.length === 0) {
		container.createEl('p', { text: 'No chords to display.', cls: 'mm-hint' });
		return;
	}

	const compact = opts.compact ?? false;
	const CELL_H  = compact ? 22 : 26;
	const CELL_W  = compact ? 44 : 50;
	const SYM     = compact ? 7  : 9;    // symbol half-size
	const ML      = compact ? 34 : 42;   // left margin (Y labels)
	const MT      = compact ? 14 : 20;   // top margin (bar numbers)
	const MB      = compact ? 8  : 22;   // bottom margin (chord labels)
	const FONT_Y  = compact ? 9  : 10;
	const FONT_X  = 8;

	const svgW = ML + points.length * CELL_W + 12;
	const svgH = MT + 12 * CELL_H + MB;

	const svg = el('svg');
	svg.setAttribute('viewBox', `0 0 ${svgW} ${svgH}`);
	svg.setAttribute('class', 'mm-chord-map-svg');

	const wrap = container.createDiv('mm-chord-map-scroll');
	wrap.appendChild(svg);

	// ── Tonic highlight band ──────────────────────────────
	if (opts.tonicCofPos !== undefined) {
		const ty = MT + opts.tonicCofPos * CELL_H;
		const band = el('rect');
		band.setAttribute('x',      String(ML));
		band.setAttribute('y',      String(ty));
		band.setAttribute('width',  String(svgW - ML - 6));
		band.setAttribute('height', String(CELL_H));
		band.setAttribute('class',  'mm-map-tonic-band');
		svg.appendChild(band);
	}

	// ── Y-axis: CoF labels + grid lines ──────────────────
	COF_LABELS.forEach((lbl, i) => {
		const y = MT + i * CELL_H + CELL_H / 2;

		const grid = el('line');
		grid.setAttribute('x1', String(ML));
		grid.setAttribute('x2', String(svgW - 6));
		grid.setAttribute('y1', String(y));
		grid.setAttribute('y2', String(y));
		grid.setAttribute('class', 'mm-map-grid');
		svg.appendChild(grid);

		const txt = el('text');
		txt.setAttribute('x', String(ML - 5));
		txt.setAttribute('y', String(y));
		txt.setAttribute('text-anchor', 'end');
		txt.setAttribute('dominant-baseline', 'middle');
		txt.setAttribute('class', 'mm-map-y-label');
		txt.setAttribute('font-size', String(FONT_Y));
		txt.textContent = lbl;
		svg.appendChild(txt);
	});

	// ── X-axis: bar numbers (top) ─────────────────────────
	if (!compact) {
		points.forEach((_, i) => {
			const x = ML + i * CELL_W + CELL_W / 2;
			const txt = el('text');
			txt.setAttribute('x', String(x));
			txt.setAttribute('y', String(MT - 6));
			txt.setAttribute('text-anchor', 'middle');
			txt.setAttribute('class', 'mm-map-x-bar-label');
			txt.setAttribute('font-size', String(FONT_X - 1));
			txt.textContent = String(i + 1);
			svg.appendChild(txt);
		});
	}

	// ── X-axis: chord name labels (bottom) ───────────────
	if (!compact) {
		points.forEach((p, i) => {
			const x = ML + i * CELL_W + CELL_W / 2;
			const txt = el('text');
			txt.setAttribute('x', String(x));
			txt.setAttribute('y', String(MT + 12 * CELL_H + MB - 6));
			txt.setAttribute('text-anchor', 'middle');
			txt.setAttribute('class', 'mm-map-x-label');
			txt.setAttribute('font-size', String(FONT_X));
			txt.textContent = p.label;
			svg.appendChild(txt);
		});
	}

	// ── Connecting lines (within each section) ────────────
	for (let i = 1; i < points.length; i++) {
		const prev = points[i - 1];
		const curr = points[i];
		if (!prev || !curr || prev.sectionIndex !== curr.sectionIndex) continue;

		const x1 = ML + (i - 1) * CELL_W + CELL_W / 2;
		const y1 = MT + prev.cofPos * CELL_H + CELL_H / 2;
		const x2 = ML + i * CELL_W + CELL_W / 2;
		const y2 = MT + curr.cofPos * CELL_H + CELL_H / 2;

		const color = resolveColor(opts, curr.sectionIndex);

		const line = el('line');
		line.setAttribute('x1', String(x1));
		line.setAttribute('y1', String(y1));
		line.setAttribute('x2', String(x2));
		line.setAttribute('y2', String(y2));
		line.setAttribute('class', 'mm-map-line');
		if (opts.colorsEnabled) line.setAttribute('stroke', color);
		svg.appendChild(line);
	}

	// ── Symbols ───────────────────────────────────────────
	points.forEach((p, i) => {
		const x = ML + i * CELL_W + CELL_W / 2;
		const y = MT + p.cofPos * CELL_H + CELL_H / 2;
		const color = resolveColor(opts, p.sectionIndex);

		const title = el('title');
		title.textContent = `${p.label} (${p.sectionLabel})`;

		if (p.isMinor) {
			// Diamond (◊) — square rotated 45°
			const sym = el('rect');
			sym.appendChild(title);
			sym.setAttribute('class', 'mm-map-sym mm-map-sym-minor');
			if (opts.colorsEnabled) {
				sym.setAttribute('stroke', color);
				sym.setAttribute('fill', color + '33');
			}
			const s = SYM * Math.SQRT2;
			sym.setAttribute('x',         String(x - s / 2));
			sym.setAttribute('y',         String(y - s / 2));
			sym.setAttribute('width',     String(s));
			sym.setAttribute('height',    String(s));
			sym.setAttribute('transform', `rotate(45,${x},${y})`);
			svg.appendChild(sym);

		} else if (p.isDominant7) {
			// Double square — outer + inner concentric squares
			const outer = el('rect');
			outer.appendChild(title);
			outer.setAttribute('class', 'mm-map-sym mm-map-sym-dom7');
			if (opts.colorsEnabled) {
				outer.setAttribute('stroke', color);
				outer.setAttribute('fill', color + '33');
			}
			outer.setAttribute('x',      String(x - SYM));
			outer.setAttribute('y',      String(y - SYM));
			outer.setAttribute('width',  String(SYM * 2));
			outer.setAttribute('height', String(SYM * 2));
			svg.appendChild(outer);

			const inner = el('rect');
			inner.setAttribute('class', 'mm-map-sym-inner');
			const inset = SYM * 0.4;
			inner.setAttribute('x',      String(x - SYM + inset));
			inner.setAttribute('y',      String(y - SYM + inset));
			inner.setAttribute('width',  String((SYM - inset) * 2));
			inner.setAttribute('height', String((SYM - inset) * 2));
			if (opts.colorsEnabled) inner.setAttribute('stroke', color);
			svg.appendChild(inner);

		} else {
			// Filled square (□) — plain major
			const sym = el('rect');
			sym.appendChild(title);
			sym.setAttribute('class', 'mm-map-sym mm-map-sym-major');
			if (opts.colorsEnabled) {
				sym.setAttribute('stroke', color);
				sym.setAttribute('fill', color + '33');
			}
			sym.setAttribute('x',      String(x - SYM));
			sym.setAttribute('y',      String(y - SYM));
			sym.setAttribute('width',  String(SYM * 2));
			sym.setAttribute('height', String(SYM * 2));
			svg.appendChild(sym);
		}
	});
}

function resolveColor(opts: ChordMapOptions, sectionIndex: number): string {
	if (!opts.colorsEnabled) return 'currentColor';
	return opts.sectionColors[sectionIndex % opts.sectionColors.length] ?? '#888';
}

/** Build a legend entry list for the section colors. */
export function renderLegend(
	container: HTMLElement,
	sections: { label: string; index: number }[],
	opts: ChordMapOptions,
): void {
	if (!opts.colorsEnabled || sections.length <= 1) return;
	const legend = container.createDiv('mm-map-legend');
	sections.forEach(s => {
		const color = resolveColor(opts, s.index);
		const item = legend.createDiv('mm-map-legend-item');
		const swatch = item.createDiv('mm-map-legend-swatch');
		swatch.style.background = color;
		item.createSpan({ text: s.label, cls: 'mm-map-legend-label' });
	});
}

/** Static symbol legend (always shown) */
export function renderSymbolLegend(container: HTMLElement): void {
	const wrap = container.createDiv('mm-map-symbol-legend');

	const NS_SVG = 'http://www.w3.org/2000/svg';
	function makeIcon(drawFn: (svg: SVGSVGElement) => void): SVGSVGElement {
		const svg = document.createElementNS(NS_SVG, 'svg') as SVGSVGElement;
		svg.setAttribute('viewBox', '-12 -12 24 24');
		svg.setAttribute('width', '20');
		svg.setAttribute('height', '20');
		svg.setAttribute('class', 'mm-sym-legend-icon');
		drawFn(svg);
		return svg;
	}

	const entries: { label: string; draw: (svg: SVGSVGElement) => void }[] = [
		{
			label: 'Major',
			draw: svg => {
				const r = document.createElementNS(NS_SVG, 'rect');
				r.setAttribute('x', '-8'); r.setAttribute('y', '-8');
				r.setAttribute('width', '16'); r.setAttribute('height', '16');
				r.setAttribute('class', 'mm-map-sym mm-map-sym-major');
				svg.appendChild(r);
			},
		},
		{
			label: 'Minor',
			draw: svg => {
				const r = document.createElementNS(NS_SVG, 'rect');
				const s = 9 * Math.SQRT2;
				r.setAttribute('x',  String(-s / 2));
				r.setAttribute('y',  String(-s / 2));
				r.setAttribute('width',  String(s));
				r.setAttribute('height', String(s));
				r.setAttribute('transform', 'rotate(45,0,0)');
				r.setAttribute('class', 'mm-map-sym mm-map-sym-minor');
				svg.appendChild(r);
			},
		},
		{
			label: 'Dominant 7',
			draw: svg => {
				const outer = document.createElementNS(NS_SVG, 'rect');
				outer.setAttribute('x', '-8'); outer.setAttribute('y', '-8');
				outer.setAttribute('width', '16'); outer.setAttribute('height', '16');
				outer.setAttribute('class', 'mm-map-sym mm-map-sym-dom7');
				svg.appendChild(outer);
				const inner = document.createElementNS(NS_SVG, 'rect');
				const inset = 8 * 0.4;
				inner.setAttribute('x',  String(-8 + inset));
				inner.setAttribute('y',  String(-8 + inset));
				inner.setAttribute('width',  String((8 - inset) * 2));
				inner.setAttribute('height', String((8 - inset) * 2));
				inner.setAttribute('class', 'mm-map-sym-inner');
				svg.appendChild(inner);
			},
		},
	];

	entries.forEach(e => {
		const item = wrap.createDiv('mm-sym-legend-item');
		item.appendChild(makeIcon(e.draw));
		item.createSpan({ text: e.label, cls: 'mm-sym-legend-label' });
	});
}
