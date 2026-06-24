import { describe, it, expect } from 'vitest';
import {
	parseChordBody,
	parseSongDirectives,
	metaFromFrontmatter,
	isSongFile,
} from '../song';

// ── parseChordBody ────────────────────────────────────────────────────────────

describe('parseChordBody', () => {
	it('splits bars by pipe', () => {
		const result = parseChordBody(['Cm | F | Bb | Eb']);
		expect(result).toEqual([['Cm'], ['F'], ['Bb'], ['Eb']]);
	});

	it('supports multiple chords per bar', () => {
		const result = parseChordBody(['Cm F | Bb Eb']);
		expect(result).toEqual([['Cm', 'F'], ['Bb', 'Eb']]);
	});

	it('filters out dots (rests)', () => {
		const result = parseChordBody(['Am | . | F | G']);
		expect(result).toEqual([['Am'], ['F'], ['G']]);
	});

	it('skips comment lines starting with //', () => {
		const result = parseChordBody(['// this is a comment', 'C | G']);
		expect(result).toEqual([['C'], ['G']]);
	});

	it('skips comment lines starting with #', () => {
		const result = parseChordBody(['# verse', 'Am | F']);
		expect(result).toEqual([['Am'], ['F']]);
	});

	it('skips blank lines', () => {
		const result = parseChordBody(['', 'C | G', '']);
		expect(result).toEqual([['C'], ['G']]);
	});

	it('returns empty array for all-comment input', () => {
		expect(parseChordBody(['// nothing', '# zilch'])).toEqual([]);
	});
});

// ── parseSongDirectives ───────────────────────────────────────────────────────

describe('parseSongDirectives', () => {
	it('parses a single labeled section', () => {
		const text = ':::song[Verse]\nAm | F | C | G\n:::';
		const result = parseSongDirectives(text);
		expect(result).toHaveLength(1);
		expect(result[0]!.label).toBe('Verse');
		expect(result[0]!.bars).toEqual([['Am'], ['F'], ['C'], ['G']]);
	});

	it('uses "Section" as default label when none given', () => {
		const text = ':::song\nC | G\n:::';
		const result = parseSongDirectives(text);
		expect(result[0]!.label).toBe('Section');
	});

	it('parses multiple sections', () => {
		const text = ':::song[Verse]\nAm | F\n:::\n:::song[Chorus]\nC | G\n:::';
		const result = parseSongDirectives(text);
		expect(result).toHaveLength(2);
		expect(result[0]!.label).toBe('Verse');
		expect(result[1]!.label).toBe('Chorus');
	});

	it('skips sections with no valid chord bars', () => {
		const text = ':::song[Empty]\n// just a comment\n:::';
		expect(parseSongDirectives(text)).toHaveLength(0);
	});

	it('ignores text outside directives', () => {
		const text = 'Some prose\n:::song[A]\nC | G\n:::\nMore prose';
		expect(parseSongDirectives(text)).toHaveLength(1);
	});

	it('returns empty array for text with no directives', () => {
		expect(parseSongDirectives('# My Note\nJust text here.')).toEqual([]);
	});
});

// ── metaFromFrontmatter ───────────────────────────────────────────────────────

describe('metaFromFrontmatter', () => {
	it('returns Untitled for null frontmatter', () => {
		expect(metaFromFrontmatter(null)).toEqual({ title: 'Untitled' });
	});

	it('reads title', () => {
		expect(metaFromFrontmatter({ title: 'My Song' }).title).toBe('My Song');
	});

	it('falls back to name when title is absent', () => {
		expect(metaFromFrontmatter({ name: 'Fallback' }).title).toBe('Fallback');
	});

	it('reads artist, key, tempo, time, genre', () => {
		const fm = { title: 'T', artist: 'A', key: 'Cm', tempo: 120, time: '4/4', genre: 'Jazz' };
		const meta = metaFromFrontmatter(fm);
		expect(meta.artist).toBe('A');
		expect(meta.key).toBe('Cm');
		expect(meta.tempo).toBe(120);
		expect(meta.time).toBe('4/4');
		expect(meta.genre).toBe('Jazz');
	});

	it('converts numeric tempo to number', () => {
		expect(metaFromFrontmatter({ tempo: '140' }).tempo).toBe(140);
	});

	it('returns undefined for absent optional fields', () => {
		const meta = metaFromFrontmatter({ title: 'T' });
		expect(meta.artist).toBeUndefined();
		expect(meta.key).toBeUndefined();
		expect(meta.tempo).toBeUndefined();
	});

	it('ignores object values for string fields', () => {
		const meta = metaFromFrontmatter({ key: { nested: true } });
		expect(meta.key).toBeUndefined();
	});
});

// ── isSongFile ────────────────────────────────────────────────────────────────

describe('isSongFile', () => {
	const empty = { title: 'Untitled' };
	const withKey = { title: 'T', key: 'C' };

	it('returns true when meta has key', () => {
		expect(isSongFile(withKey, [], null, '', '')).toBe(true);
	});

	it('returns true when meta has artist', () => {
		expect(isSongFile({ title: 'T', artist: 'Bob' }, [], null, '', '')).toBe(true);
	});

	it('returns true when meta has tempo', () => {
		expect(isSongFile({ title: 'T', tempo: 120 }, [], null, '', '')).toBe(true);
	});

	it('returns true when meta has time', () => {
		expect(isSongFile({ title: 'T', time: '3/4' }, [], null, '', '')).toBe(true);
	});

	it('returns true when sections are present', () => {
		const sections = [{ label: 'V', bars: [['C']] }];
		expect(isSongFile(empty, sections, null, '', '')).toBe(true);
	});

	it('returns false when no music data at all', () => {
		expect(isSongFile(empty, [], null, '', '')).toBe(false);
	});

	it('returns true when frontmatter tag matches configured key+value', () => {
		const fm = { type: 'song' };
		expect(isSongFile(empty, [], fm, 'type', 'song')).toBe(true);
	});

	it('returns false when tag key matches but value does not', () => {
		const fm = { type: 'note' };
		expect(isSongFile(empty, [], fm, 'type', 'song')).toBe(false);
	});

	it('ignores tag check when tagKey is empty string', () => {
		const fm = { type: 'song' };
		expect(isSongFile(empty, [], fm, '', 'song')).toBe(false);
	});

	it('returns false when tagKey is set but frontmatter is null', () => {
		expect(isSongFile(empty, [], null, 'type', 'song')).toBe(false);
	});
});
