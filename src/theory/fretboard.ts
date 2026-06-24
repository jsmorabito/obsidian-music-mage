const CHROMATIC: string[] = [
	'C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B',
];

/**
 * Open-string MIDI note numbers keyed by string name.
 * Standard bass 4-string: low E=40, A=45, D=50, G=55
 * Standard guitar 6-string: low E=40, A=45, D=50, G=55, B=59, high e=64
 * String names are case-sensitive: capital E = low E (MIDI 40), lowercase e = high e (MIDI 64).
 */
export const TUNINGS: Record<string, Record<string, number>> = {
	'EADG':   { E: 40, A: 45, D: 50, G: 55 },
	'BEADG':  { B: 35, E: 40, A: 45, D: 50, G: 55 },
	'EADGBE': { E: 40, A: 45, D: 50, G: 55, B: 59, e: 64 },
	'DADGBE': { D: 38, A: 45, d: 50, G: 55, B: 59, e: 64 },
};

export function getTuning(name: string): Record<string, number> {
	return TUNINGS[name] ?? TUNINGS['EADG']!;
}

/** fret + open string MIDI → pitch class 0–11 */
export function fretToPitchClass(stringName: string, fret: number, tuning: Record<string, number>): number | null {
	const open = tuning[stringName];
	if (open === undefined) return null;
	return (open + fret) % 12;
}

/** pitch class → note name using sharp spelling */
export function pitchClassName(pc: number): string {
	return CHROMATIC[pc % 12] ?? 'C';
}

/** fret + string → note name, or null if string not in tuning */
export function fretToNote(stringName: string, fret: number, tuning: Record<string, number>): string | null {
	const pc = fretToPitchClass(stringName, fret, tuning);
	if (pc === null) return null;
	return pitchClassName(pc);
}

/**
 * Parse standard ASCII tab lines into (stringName → frets per bar).
 * Input: array of lines like ["G|--0--3--|--5--3--|", "D|--0--0--|--0--0--|", ...]
 * Output: for each bar index, a map of stringName → fret numbers found in that bar.
 */
export interface TabBar {
	barIndex: number;
	/** stringName → list of fret numbers played in this bar */
	fretsByString: Record<string, number[]>;
}

export function parseTabLines(lines: string[]): TabBar[] {
	const stringBars: { name: string; bars: string[] }[] = [];

	for (const line of lines) {
		const trimmed = line.trim();
		const match = trimmed.match(/^([A-Ga-g][#b♯♭]?)\s*\|(.+)/);
		if (!match) continue;

		const name = match[1] ?? '';
		const rest = match[2] ?? '';
		// Strip trailing | then split on | to get bars
		const cleaned = rest.endsWith('|') ? rest.slice(0, -1) : rest;
		const bars = cleaned.split('|');
		stringBars.push({ name, bars });
	}

	if (stringBars.length === 0) return [];

	const numBars = Math.max(...stringBars.map(s => s.bars.length));
	const result: TabBar[] = [];

	for (let bi = 0; bi < numBars; bi++) {
		const fretsByString: Record<string, number[]> = {};
		for (const { name, bars } of stringBars) {
			const barStr = bars[bi] ?? '';
			const frets = extractFrets(barStr);
			if (frets.length > 0) fretsByString[name] = frets;
		}
		result.push({ barIndex: bi, fretsByString });
	}

	return result;
}

/** Extract all fret numbers (including multi-digit) from a tab segment like '--0--12--3--' */
export function extractFrets(segment: string): number[] {
	const frets: number[] = [];
	const matches = segment.matchAll(/\d+/g);
	for (const m of matches) {
		frets.push(parseInt(m[0], 10));
	}
	return frets;
}
