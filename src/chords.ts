export const NOTES_SHARP = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
export const NOTES_FLAT  = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];

export interface ChordType {
	name: string;
	symbol: string;
	intervals: number[];
	intervalNames: string[];
}

export const CHORD_TYPES: ChordType[] = [
	{ name: 'Major',            symbol: '',      intervals: [0, 4, 7],      intervalNames: ['R', 'M3', 'P5']          },
	{ name: 'Minor',            symbol: 'm',     intervals: [0, 3, 7],      intervalNames: ['R', 'm3', 'P5']          },
	{ name: 'Dominant 7th',     symbol: '7',     intervals: [0, 4, 7, 10],  intervalNames: ['R', 'M3', 'P5', 'm7']   },
	{ name: 'Major 7th',        symbol: 'maj7',  intervals: [0, 4, 7, 11],  intervalNames: ['R', 'M3', 'P5', 'M7']   },
	{ name: 'Minor 7th',        symbol: 'm7',    intervals: [0, 3, 7, 10],  intervalNames: ['R', 'm3', 'P5', 'm7']   },
	{ name: 'Minor/Major 7th',  symbol: 'mMaj7', intervals: [0, 3, 7, 11],  intervalNames: ['R', 'm3', 'P5', 'M7']   },
	{ name: 'Diminished',       symbol: 'dim',   intervals: [0, 3, 6],      intervalNames: ['R', 'm3', 'd5']          },
	{ name: 'Diminished 7th',   symbol: 'dim7',  intervals: [0, 3, 6, 9],   intervalNames: ['R', 'm3', 'd5', 'd7']   },
	{ name: 'Half-Diminished',  symbol: 'm7b5',  intervals: [0, 3, 6, 10],  intervalNames: ['R', 'm3', 'd5', 'm7']   },
	{ name: 'Augmented',        symbol: 'aug',   intervals: [0, 4, 8],      intervalNames: ['R', 'M3', 'A5']          },
	{ name: 'Suspended 2nd',    symbol: 'sus2',  intervals: [0, 2, 7],      intervalNames: ['R', 'M2', 'P5']          },
	{ name: 'Suspended 4th',    symbol: 'sus4',  intervals: [0, 5, 7],      intervalNames: ['R', 'P4', 'P5']          },
	{ name: 'Add 9',            symbol: 'add9',  intervals: [0, 4, 7, 14],  intervalNames: ['R', 'M3', 'P5', 'M9']   },
	{ name: 'Major 6th',        symbol: '6',     intervals: [0, 4, 7, 9],   intervalNames: ['R', 'M3', 'P5', 'M6']   },
	{ name: 'Minor 6th',        symbol: 'm6',    intervals: [0, 3, 7, 9],   intervalNames: ['R', 'm3', 'P5', 'M6']   },
	{ name: 'Dominant 9th',     symbol: '9',     intervals: [0, 4, 7, 10, 14], intervalNames: ['R', 'M3', 'P5', 'm7', 'M9'] },
	{ name: 'Major 9th',        symbol: 'maj9',  intervals: [0, 4, 7, 11, 14], intervalNames: ['R', 'M3', 'P5', 'M7', 'M9'] },
	{ name: 'Minor 9th',        symbol: 'm9',    intervals: [0, 3, 7, 10, 14], intervalNames: ['R', 'm3', 'P5', 'm7', 'M9'] },
];

// Enharmonic input aliases → canonical index in NOTES_SHARP/FLAT
const ROOT_MAP: Record<string, number> = {
	'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
	'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8,
	'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11,
	// with symbols
	'C♯': 1, 'D♭': 1, 'D♯': 3, 'E♭': 3, 'F♯': 6,
	'G♭': 6, 'G♯': 8, 'A♭': 8, 'A♯': 10, 'B♭': 10,
};

// Roots that prefer flat spelling
const PREFERS_FLAT = new Set([1, 3, 6, 8, 10]); // Db, Eb, Gb, Ab, Bb columns
// Actually we'll check the input root for preference
const FLAT_ROOTS = new Set([1, 3, 8, 10]); // Db Eb Ab Bb

export interface ParsedChord {
	root: string;
	rootIndex: number;
	type: ChordType;
	notes: string[];
}

export function parseChord(input: string): ParsedChord | null {
	const s = input.trim();
	if (!s) return null;

	// Match root: letter + optional #/b/♯/♭
	const rootMatch = s.match(/^([A-Ga-g][#b♯♭]?)/);
	if (!rootMatch) return null;

	const matched: string = rootMatch[1] ?? '';
	const rawRoot = matched.replace('b', '♭').replace('#', '♯');
	const rootIndex = ROOT_MAP[matched] ?? ROOT_MAP[rawRoot.replace('♯', '#').replace('♭', 'b')];
	if (rootIndex === undefined) return null;

	const suffix = s.slice(matched.length);

	// Find matching chord type (longest match first)
	const sorted = [...CHORD_TYPES].sort((a, b) => b.symbol.length - a.symbol.length);
	const type = sorted.find(ct => ct.symbol.toLowerCase() === suffix.toLowerCase())
		?? (suffix === '' ? CHORD_TYPES[0] : null);
	if (!type) return null;

	const useFlats = FLAT_ROOTS.has(rootIndex) || matched.includes('b') || matched.includes('♭');
	const noteScale = useFlats ? NOTES_FLAT : NOTES_SHARP;

	const notes = type.intervals.map(i => noteScale[(rootIndex + i) % 12] as string);
	const canonicalRoot = noteScale[rootIndex] as string;

	return { root: canonicalRoot, rootIndex, type, notes };
}

export function getNotesForRoot(rootIndex: number, type: ChordType): string[] {
	const useFlats = FLAT_ROOTS.has(rootIndex);
	const scale = useFlats ? NOTES_FLAT : NOTES_SHARP;
	return type.intervals.map(i => scale[(rootIndex + i) % 12] as string);
}
