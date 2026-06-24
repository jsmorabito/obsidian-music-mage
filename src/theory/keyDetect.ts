import { pitchClassName } from './fretboard';
import type { ParsedChord } from '../chords';

const MAJOR_INTERVALS = [0, 2, 4, 5, 7, 9, 11];
const MINOR_INTERVALS = [0, 2, 3, 5, 7, 8, 10];

// Diatonic triad qualities per scale degree
const MAJOR_QUALITIES = ['', 'm', 'm', '', '', 'm', 'dim'] as const;
const MINOR_QUALITIES = ['m', 'dim', '', 'm', 'm', '', '']  as const;

const ROMAN_MAJOR = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
const ROMAN_MINOR = ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII'];

// Display names for the 12 pitch classes — flat-preferring for key names
const KEY_NAMES: string[] = [
	'C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B',
];

export const NOTE_TO_PC: Record<string, number> = {
	'C': 0,  'B♯': 0,
	'C♯': 1, 'C#': 1, 'D♭': 1, 'Db': 1,
	'D': 2,
	'D♯': 3, 'D#': 3, 'E♭': 3, 'Eb': 3,
	'E': 4,  'F♭': 4,
	'F': 5,  'E♯': 5,
	'F♯': 6, 'F#': 6, 'G♭': 6, 'Gb': 6,
	'G': 7,
	'G♯': 8, 'G#': 8, 'A♭': 8, 'Ab': 8,
	'A': 9,
	'A♯': 10,'A#': 10,'B♭': 10,'Bb': 10,
	'B': 11, 'C♭': 11,'Cb': 11,
};

export interface AnalysisBeat {
	barIndex: number;
	/** Pitch-class note names derived from bass tab */
	bassNotes: string[];
	chordName: string | null;
	parsedChord: ParsedChord | null;
}

export interface ChordInContext {
	chordName: string;
	roman: string | null;
	isDiatonic: boolean;
	bassNote: string | null;
	/** Relationship of bass note to chord: root position, inversion, or outside */
	inversion: 'root' | 'first' | 'second' | 'outside' | null;
}

export interface KeyCandidate {
	key: string;               // e.g. "C major"
	root: number;              // pitch class 0–11
	mode: 'major' | 'minor';
	score: number;             // 0–1
	chordBreakdown: ChordInContext[];
}

export interface KeyDetectionResult {
	candidates: KeyCandidate[];      // top 3, score descending
	dominantBassNote: string | null; // most frequent bass pitch class
	totalBeats: number;
}

export function detectKey(beats: AnalysisBeat[]): KeyDetectionResult {
	const allBassPCs: number[] = [];
	for (const beat of beats) {
		for (const note of beat.bassNotes) {
			const pc = NOTE_TO_PC[note];
			if (pc !== undefined) allBassPCs.push(pc);
		}
	}

	// Most frequent bass pitch class
	const pcFreq = new Map<number, number>();
	for (const pc of allBassPCs) pcFreq.set(pc, (pcFreq.get(pc) ?? 0) + 1);
	let dominantBassPC: number | null = null;
	let maxFreq = 0;
	for (const [pc, freq] of pcFreq) {
		if (freq > maxFreq) { maxFreq = freq; dominantBassPC = pc; }
	}
	const dominantBassNote = dominantBassPC !== null ? (pitchClassName(dominantBassPC)) : null;

	const chordBeats = beats.filter(b => b.parsedChord !== null);

	const candidates: KeyCandidate[] = [];

	for (let root = 0; root < 12; root++) {
		for (const mode of ['major', 'minor'] as const) {
			const intervals = mode === 'major' ? MAJOR_INTERVALS : MINOR_INTERVALS;
			const qualities = mode === 'major' ? MAJOR_QUALITIES : MINOR_QUALITIES;
			const scaleSet = new Set(intervals.map(i => (root + i) % 12));

			// Bass note fit — fraction of bass notes in scale
			let bassScore = 1;
			if (allBassPCs.length > 0) {
				const inScale = allBassPCs.filter(pc => scaleSet.has(pc)).length;
				bassScore = inScale / allBassPCs.length;
			}

			// Chord fit — fraction of chords that are diatonic (root in scale + quality matches)
			let chordScore = 1;
			if (chordBeats.length > 0) {
				let matches = 0;
				for (const beat of chordBeats) {
					if (!beat.parsedChord) continue;
					const rootPC = NOTE_TO_PC[beat.parsedChord.root];
					if (rootPC === undefined) continue;
					const degreeOffset = (rootPC - root + 12) % 12;
					const degreeIdx = intervals.indexOf(degreeOffset);
					if (degreeIdx === -1) continue;
					const expected = qualities[degreeIdx] ?? '';
					const actual = beat.parsedChord.type.symbol;
					// Flexible: m7 matches m, maj7 matches '', dim7 matches dim, etc.
					// Note: `actual.startsWith(expected)` must guard against expected=''
					// because every string starts with '' — that would make all chords match.
					const match = actual === expected
						|| (expected !== '' && actual.startsWith(expected))
						|| (expected === '' && !actual.startsWith('m') && !actual.includes('dim') && !actual.includes('aug'));
					if (match) matches++;
				}
				chordScore = matches / chordBeats.length;
			}

			// Bonus: dominant bass note = key root
			const tonicBonus = dominantBassPC === root ? 0.08 : 0;

			const score = Math.min(chordScore * 0.60 + bassScore * 0.32 + tonicBonus, 1);

			candidates.push({
				key: `${KEY_NAMES[root] ?? 'C'} ${mode}`,
				root,
				mode,
				score,
				chordBreakdown: buildBreakdown(beats, root, mode, intervals, qualities),
			});
		}
	}

	candidates.sort((a, b) => b.score - a.score);

	return {
		candidates: candidates.slice(0, 3),
		dominantBassNote,
		totalBeats: beats.length,
	};
}

function buildBreakdown(
	beats: AnalysisBeat[],
	root: number,
	mode: 'major' | 'minor',
	intervals: number[],
	qualities: readonly string[],
): ChordInContext[] {
	const ROMAN = mode === 'major' ? ROMAN_MAJOR : ROMAN_MINOR;
	const seen = new Set<string>();
	const result: ChordInContext[] = [];

	for (const beat of beats) {
		if (!beat.parsedChord || !beat.chordName) continue;
		if (seen.has(beat.chordName)) continue;
		seen.add(beat.chordName);

		const rootPC = NOTE_TO_PC[beat.parsedChord.root];
		if (rootPC === undefined) continue;

		const degreeOffset = (rootPC - root + 12) % 12;
		const degreeIdx = intervals.indexOf(degreeOffset);
		const isDiatonic = degreeIdx !== -1;
		const roman = isDiatonic ? (ROMAN[degreeIdx] ?? null) : null;

		// Inversion: compare first bass note against chord tones
		const bassNoteName = beat.bassNotes[0] ?? null;
		let inversion: ChordInContext['inversion'] = null;
		if (bassNoteName && beat.parsedChord) {
			const bassPC = NOTE_TO_PC[bassNoteName];
			const chordRootPC = NOTE_TO_PC[beat.parsedChord.root] ?? 0;
			const chordPCs = beat.parsedChord.type.intervals.map(i => (chordRootPC + i) % 12);
			if (bassPC !== undefined) {
				if (bassPC === chordPCs[0])      inversion = 'root';
				else if (bassPC === chordPCs[1]) inversion = 'first';
				else if (bassPC === chordPCs[2]) inversion = 'second';
				else                             inversion = 'outside';
			}
		}

		result.push({ chordName: beat.chordName, roman, isDiatonic, bassNote: bassNoteName, inversion });
	}

	return result;
}
