import { describe, it, expect } from 'vitest';
import { detectKey, AnalysisBeat } from '../theory/keyDetect';
import { parseChord } from '../chords';

function beat(chordName: string, bassNotes: string[] = [], barIndex = 0): AnalysisBeat {
	return { barIndex, bassNotes, chordName, parsedChord: parseChord(chordName) };
}

describe('detectKey', () => {
	it('returns null dominant bass note for empty input', () => {
		const result = detectKey([]);
		expect(result.dominantBassNote).toBeNull();
	});

	it('detects C major from I–IV–V–I', () => {
		const beats = [beat('C'), beat('F'), beat('G'), beat('C')];
		const result = detectKey(beats);
		expect(result.candidates[0]!.key).toBe('C major');
	});

	it('detects A minor when E major (V) is present with A root bass', () => {
		// E major is diatonic to A minor but not C major, disambiguating the key
		const beats = [
			beat('Am', ['A']),
			beat('Dm', ['D']),
			beat('E', ['E']),
			beat('Am', ['A']),
		];
		const result = detectKey(beats);
		expect(result.candidates[0]!.key).toBe('A minor');
	});

	it('top candidate score is highest', () => {
		const beats = [beat('C'), beat('Am'), beat('F'), beat('G')];
		const result = detectKey(beats);
		const scores = result.candidates.map(c => c.score);
		expect(scores[0]! >= (scores[1] ?? 0)).toBe(true);
		expect(scores[1]! >= (scores[2] ?? 0)).toBe(true);
	});

	it('returns at most 3 candidates', () => {
		const beats = [beat('C'), beat('G'), beat('F')];
		expect(detectKey(beats).candidates.length).toBeLessThanOrEqual(3);
	});

	it('reports dominant bass note', () => {
		const beats = [
			beat('C', ['C', 'C']),
			beat('F', ['C']),
			beat('G', ['G']),
		];
		expect(detectKey(beats).dominantBassNote).toBe('C');
	});

	it('chord breakdown contains all input chords', () => {
		const beats = [beat('C'), beat('Am'), beat('F'), beat('G')];
		const result = detectKey(beats);
		const top = result.candidates[0]!;
		expect(top.chordBreakdown.map(b => b.chordName)).toEqual(['C', 'Am', 'F', 'G']);
	});

	it('marks diatonic chords as diatonic in C major', () => {
		const beats = [beat('C'), beat('Am'), beat('F'), beat('G')];
		const result = detectKey(beats);
		const top = result.candidates[0]!;
		expect(top.chordBreakdown.every(b => b.isDiatonic)).toBe(true);
	});

	it('marks non-diatonic chord in C major', () => {
		const beats = [beat('C'), beat('Bb'), beat('F'), beat('G')];
		const result = detectKey(beats);
		const top = result.candidates[0]!;
		const bb = top.chordBreakdown.find(b => b.chordName === 'B♭' || b.chordName === 'Bb');
		expect(bb?.isDiatonic).toBe(false);
	});
});
