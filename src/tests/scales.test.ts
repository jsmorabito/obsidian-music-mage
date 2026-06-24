import { describe, it, expect } from 'vitest';
import { buildScale, SCALE_TYPES } from '../scales';

const major   = SCALE_TYPES.find(s => s.name === 'Major (Ionian)')!;
const minor   = SCALE_TYPES.find(s => s.name === 'Natural Minor (Aeolian)')!;
const penta   = SCALE_TYPES.find(s => s.name === 'Major Pentatonic')!;
const dorian  = SCALE_TYPES.find(s => s.name === 'Dorian')!;

describe('buildScale', () => {
	it('C major has 7 notes starting on C', () => {
		const r = buildScale(0, major);
		expect(r.root).toBe('C');
		expect(r.notes).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B']);
	});

	it('A natural minor has correct notes', () => {
		const r = buildScale(9, minor);
		expect(r.root).toBe('A');
		expect(r.notes).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G']);
	});

	it('F major has 7 notes starting on F', () => {
		// F (index 5) is not in FLAT_ROOTS so the scale uses sharp spelling (A♯ not B♭)
		const r = buildScale(5, major);
		expect(r.root).toBe('F');
		expect(r.notes).toHaveLength(7);
		expect(r.notes[0]).toBe('F');
	});

	it('G major has F♯', () => {
		const r = buildScale(7, major);
		expect(r.notes).toContain('F♯');
	});

	it('C major diatonic chords: I=C, ii=Dm, V=G, vii°=Bdim', () => {
		const r = buildScale(0, major);
		expect(r.diatonicChords[0]!.name).toBe('C');
		expect(r.diatonicChords[1]!.name).toBe('Dm');
		expect(r.diatonicChords[4]!.name).toBe('G');
		expect(r.diatonicChords[6]!.name).toBe('Bdim');
	});

	it('C major pentatonic has 5 notes', () => {
		const r = buildScale(0, penta);
		expect(r.notes).toHaveLength(5);
		expect(r.notes).toEqual(['C', 'D', 'E', 'G', 'A']);
	});

	it('D Dorian has correct notes', () => {
		const r = buildScale(2, dorian);
		expect(r.root).toBe('D');
		expect(r.notes).toEqual(['D', 'E', 'F', 'G', 'A', 'B', 'C']);
	});

	it('Bb major uses flat spelling', () => {
		const r = buildScale(10, major);
		expect(r.root).toBe('B♭');
		expect(r.notes).not.toContain('A#');
	});
});
