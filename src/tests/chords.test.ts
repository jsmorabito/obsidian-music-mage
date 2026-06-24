import { describe, it, expect } from 'vitest';
import { parseChord, getNotesForRoot, CHORD_TYPES } from '../chords';

// ── parseChord ────────────────────────────────────────────────────────────────

describe('parseChord', () => {
	it('parses a major chord', () => {
		const r = parseChord('C');
		expect(r?.root).toBe('C');
		expect(r?.type.name).toBe('Major');
	});

	it('parses a minor chord', () => {
		const r = parseChord('Am');
		expect(r?.root).toBe('A');
		expect(r?.type.symbol).toBe('m');
	});

	it('parses maj7', () => {
		const r = parseChord('Fmaj7');
		expect(r?.root).toBe('F');
		expect(r?.type.symbol).toBe('maj7');
	});

	it('parses dominant 7th', () => {
		const r = parseChord('G7');
		expect(r?.type.symbol).toBe('7');
	});

	it('parses sharps (#)', () => {
		const r = parseChord('F#m7');
		expect(r?.rootIndex).toBe(6);
		expect(r?.type.symbol).toBe('m7');
	});

	it('parses flats (b)', () => {
		const r = parseChord('Bbmaj7');
		expect(r?.rootIndex).toBe(10);
		expect(r?.type.symbol).toBe('maj7');
	});

	it('is case-insensitive for suffix', () => {
		// suffix matching is lowercased: 'MAJ7' → 'maj7', 'M7' → 'm7' (minor 7th)
		expect(parseChord('CMAJ7')?.type.symbol).toBe('maj7');
		expect(parseChord('CM7')?.type.symbol).toBe('m7');
	});

	it('returns null for empty string', () => {
		expect(parseChord('')).toBeNull();
	});

	it('returns null for unrecognized chord', () => {
		expect(parseChord('X##')).toBeNull();
	});

	it('returns null for unknown suffix', () => {
		expect(parseChord('Cadd13')).toBeNull();
	});
});

// ── getNotesForRoot ───────────────────────────────────────────────────────────

describe('getNotesForRoot', () => {
	const major = CHORD_TYPES.find(t => t.name === 'Major')!;
	const minor = CHORD_TYPES.find(t => t.name === 'Minor')!;
	const maj7  = CHORD_TYPES.find(t => t.symbol === 'maj7')!;

	it('C major = C E G', () => {
		expect(getNotesForRoot(0, major)).toEqual(['C', 'E', 'G']);
	});

	it('A minor = A C E', () => {
		expect(getNotesForRoot(9, minor)).toEqual(['A', 'C', 'E']);
	});

	it('F major = F A C', () => {
		expect(getNotesForRoot(5, major)).toEqual(['F', 'A', 'C']);
	});

	it('Bb major uses flat spelling', () => {
		expect(getNotesForRoot(10, major)).toEqual(['B♭', 'D', 'F']);
	});

	it('Cmaj7 = C E G B', () => {
		expect(getNotesForRoot(0, maj7)).toEqual(['C', 'E', 'G', 'B']);
	});

	it('Fmaj7 = F A C E', () => {
		expect(getNotesForRoot(5, maj7)).toEqual(['F', 'A', 'C', 'E']);
	});
});
