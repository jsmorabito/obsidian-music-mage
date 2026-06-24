import { NOTES_SHARP, NOTES_FLAT } from './chords';

export interface ScaleType {
	name: string;
	category: string;
	intervals: number[];       // semitones from root
	intervalNames: string[];   // e.g. ['R','M2','M3',...]
	chordQualities: string[];  // chord suffix per degree
}

export const SCALE_TYPES: ScaleType[] = [
	// ── Diatonic modes ──────────────────────────────────────
	{
		name: 'Major (Ionian)',
		category: 'Diatonic',
		intervals: [0, 2, 4, 5, 7, 9, 11],
		intervalNames: ['R', 'M2', 'M3', 'P4', 'P5', 'M6', 'M7'],
		chordQualities: ['', 'm', 'm', '', '', 'm', 'dim'],
	},
	{
		name: 'Dorian',
		category: 'Diatonic',
		intervals: [0, 2, 3, 5, 7, 9, 10],
		intervalNames: ['R', 'M2', 'm3', 'P4', 'P5', 'M6', 'm7'],
		chordQualities: ['m', 'm', '', '', 'm', 'dim', ''],
	},
	{
		name: 'Phrygian',
		category: 'Diatonic',
		intervals: [0, 1, 3, 5, 7, 8, 10],
		intervalNames: ['R', 'm2', 'm3', 'P4', 'P5', 'm6', 'm7'],
		chordQualities: ['m', '', '', 'm', 'dim', '', 'm'],
	},
	{
		name: 'Lydian',
		category: 'Diatonic',
		intervals: [0, 2, 4, 6, 7, 9, 11],
		intervalNames: ['R', 'M2', 'M3', 'A4', 'P5', 'M6', 'M7'],
		chordQualities: ['', '', 'm', 'dim', '', 'm', 'm'],
	},
	{
		name: 'Mixolydian',
		category: 'Diatonic',
		intervals: [0, 2, 4, 5, 7, 9, 10],
		intervalNames: ['R', 'M2', 'M3', 'P4', 'P5', 'M6', 'm7'],
		chordQualities: ['', 'm', 'dim', '', 'm', 'm', ''],
	},
	{
		name: 'Natural Minor (Aeolian)',
		category: 'Diatonic',
		intervals: [0, 2, 3, 5, 7, 8, 10],
		intervalNames: ['R', 'M2', 'm3', 'P4', 'P5', 'm6', 'm7'],
		chordQualities: ['m', 'dim', '', 'm', 'm', '', ''],
	},
	{
		name: 'Locrian',
		category: 'Diatonic',
		intervals: [0, 1, 3, 5, 6, 8, 10],
		intervalNames: ['R', 'm2', 'm3', 'P4', 'd5', 'm6', 'm7'],
		chordQualities: ['dim', '', 'm', 'm', '', '', 'm'],
	},
	// ── Minor variants ──────────────────────────────────────
	{
		name: 'Harmonic Minor',
		category: 'Minor',
		intervals: [0, 2, 3, 5, 7, 8, 11],
		intervalNames: ['R', 'M2', 'm3', 'P4', 'P5', 'm6', 'M7'],
		chordQualities: ['m', 'dim', 'aug', 'm', '', '', 'dim'],
	},
	{
		name: 'Melodic Minor',
		category: 'Minor',
		intervals: [0, 2, 3, 5, 7, 9, 11],
		intervalNames: ['R', 'M2', 'm3', 'P4', 'P5', 'M6', 'M7'],
		chordQualities: ['m', 'm', 'aug', '', '', 'dim', 'dim'],
	},
	// ── Pentatonic ──────────────────────────────────────────
	{
		name: 'Major Pentatonic',
		category: 'Pentatonic',
		intervals: [0, 2, 4, 7, 9],
		intervalNames: ['R', 'M2', 'M3', 'P5', 'M6'],
		chordQualities: [],
	},
	{
		name: 'Minor Pentatonic',
		category: 'Pentatonic',
		intervals: [0, 3, 5, 7, 10],
		intervalNames: ['R', 'm3', 'P4', 'P5', 'm7'],
		chordQualities: [],
	},
	// ── Blues ────────────────────────────────────────────────
	{
		name: 'Blues',
		category: 'Blues',
		intervals: [0, 3, 5, 6, 7, 10],
		intervalNames: ['R', 'm3', 'P4', 'A4', 'P5', 'm7'],
		chordQualities: [],
	},
	// ── Symmetric ───────────────────────────────────────────
	{
		name: 'Whole Tone',
		category: 'Symmetric',
		intervals: [0, 2, 4, 6, 8, 10],
		intervalNames: ['R', 'M2', 'M3', 'A4', 'A5', 'm7'],
		chordQualities: [],
	},
	{
		name: 'Diminished (Half-Whole)',
		category: 'Symmetric',
		intervals: [0, 1, 3, 4, 6, 7, 9, 10],
		intervalNames: ['R', 'm2', 'm3', 'M3', 'A4', 'P5', 'M6', 'm7'],
		chordQualities: [],
	},
	{
		name: 'Diminished (Whole-Half)',
		category: 'Symmetric',
		intervals: [0, 2, 3, 5, 6, 8, 9, 11],
		intervalNames: ['R', 'M2', 'm3', 'P4', 'A4', 'M6', 'M6', 'M7'],
		chordQualities: [],
	},
];

const FLAT_ROOTS = new Set([1, 3, 8, 10]);

export interface ScaleResult {
	root: string;
	scale: ScaleType;
	notes: string[];
	diatonicChords: Array<{ name: string; notes: string[] }>;
}

export function buildScale(rootIndex: number, scale: ScaleType): ScaleResult {
	const useFlats = FLAT_ROOTS.has(rootIndex);
	const noteScale = useFlats ? NOTES_FLAT : NOTES_SHARP;
	const root = noteScale[rootIndex] as string;
	const notes = scale.intervals.map(i => noteScale[(rootIndex + i) % 12] as string);

	const diatonicChords = scale.chordQualities.length > 0
		? scale.chordQualities.map((quality, i) => {
			const chordRoot = notes[i] as string;
			const chordNotes = buildTriad(rootIndex, scale.intervals[i] ?? 0, quality, noteScale);
			return { name: chordRoot + quality, notes: chordNotes };
		})
		: [];

	return { root, scale, notes, diatonicChords };
}

function buildTriad(rootIndex: number, degreeOffset: number, quality: string, noteScale: string[]): string[] {
	const r = (rootIndex + degreeOffset) % 12;
	const offsets = quality === 'm'   ? [0, 3, 7]
		: quality === 'dim' ? [0, 3, 6]
		: quality === 'aug' ? [0, 4, 8]
		:                     [0, 4, 7];
	return offsets.map(o => noteScale[(r + o) % 12] as string);
}

export const CATEGORIES = [...new Set(SCALE_TYPES.map(s => s.category))];
