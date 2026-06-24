import { getTuning, parseTabLines, fretToNote } from './theory/fretboard';
import { parseChord } from './chords';
import type { AnalysisBeat } from './theory/keyDetect';

export type Instrument = 'bass' | 'guitar';
export type Alignment  = 'bar' | 'beat';

export interface RawTrack {
	label:      string;
	score:      string;
	instrument: Instrument;
	tuning:     string;
	body:       string;
}

export interface ParsedTrack extends RawTrack {
	beats: AnalysisBeat[];
}

export interface ScoreGroup {
	scoreId: string;
	tracks:  ParsedTrack[];
	/** Merged beats — each entry pairs guitar chord + bass notes at the same bar */
	merged:  AnalysisBeat[];
}

// ── File-level parsing ───────────────────────────────────────────────────────

/** Extract all :::track directives from raw note text. */
export function parseTrackDirectives(text: string): RawTrack[] {
	const tracks: RawTrack[] = [];
	const lines = text.split('\n');
	let i = 0;

	while (i < lines.length) {
		const line = lines[i] ?? '';
		const openMatch = line.match(/^:::track(?:\[([^\]]*)\])?(?:\{([^}]*)\})?/);
		if (!openMatch) { i++; continue; }

		const label     = openMatch[1]?.trim() ?? '';
		const attrsStr  = openMatch[2] ?? '';
		const attrs     = parseAttrs(attrsStr);
		const instrument: Instrument = attrs['instrument'] === 'guitar' ? 'guitar' : 'bass';
		const tuning    = attrs['tuning'] ?? (instrument === 'bass' ? 'EADG' : 'EADGBE');
		const score     = attrs['score'] ?? 'default';

		const bodyLines: string[] = [];
		i++;
		while (i < lines.length && (lines[i] ?? '').trim() !== ':::') {
			bodyLines.push(lines[i] ?? '');
			i++;
		}
		i++; // consume closing :::

		tracks.push({ label, score, instrument, tuning, body: bodyLines.join('\n') });
	}

	return tracks;
}

/** Parse all tracks from a note and group them by score= attribute. */
export function buildScoreGroups(text: string, alignment: Alignment): ScoreGroup[] {
	const raws = parseTrackDirectives(text);
	const parsed = raws.map(r => ({ ...r, beats: parseTrackBody(r, alignment) }));

	const groupMap = new Map<string, ParsedTrack[]>();
	for (const t of parsed) {
		const arr = groupMap.get(t.score) ?? [];
		arr.push(t);
		groupMap.set(t.score, arr);
	}

	return [...groupMap.entries()].map(([scoreId, tracks]) => ({
		scoreId,
		tracks,
		merged: mergeBeats(tracks),
	}));
}

// ── Track body parsing ───────────────────────────────────────────────────────

export function parseTrackBody(track: RawTrack, alignment: Alignment): AnalysisBeat[] {
	const lines = track.body.split('\n').map(l => l.trim()).filter(Boolean);
	if (looksLikeTab(lines)) {
		return parseTabBodyLines(lines, track.tuning);
	}
	return parseChordLines(lines);
}

function looksLikeTab(lines: string[]): boolean {
	return lines.some(l => /^[A-Ga-g][#b♯♭]?\s*\|/.test(l));
}

function parseTabBodyLines(lines: string[], tuningName: string): AnalysisBeat[] {
	const tuning = getTuning(tuningName);
	const bars   = parseTabLines(lines);

	return bars.map(bar => {
		const notes: string[] = [];
		for (const [stringName, frets] of Object.entries(bar.fretsByString)) {
			for (const fret of frets) {
				const note = fretToNote(stringName, fret, tuning);
				if (note) notes.push(note);
			}
		}
		return {
			barIndex:    bar.barIndex,
			bassNotes:   [...new Set(notes)],
			chordName:   null,
			parsedChord: null,
		};
	});
}

function parseChordLines(lines: string[]): AnalysisBeat[] {
	const beats: AnalysisBeat[] = [];
	let barIndex = 0;

	for (const line of lines) {
		if (line.startsWith('//') || line.startsWith('#')) continue;
		for (const barStr of line.split('|')) {
			const tokens = barStr.trim().split(/\s+/).filter(t => t && t !== '.');
			for (const token of tokens) {
				beats.push({
					barIndex,
					bassNotes:   [],
					chordName:   token,
					parsedChord: parseChord(token),
				});
			}
			barIndex++;
		}
	}
	return beats;
}

// ── Beat merging ─────────────────────────────────────────────────────────────

function mergeBeats(tracks: ParsedTrack[]): AnalysisBeat[] {
	const bassTrack   = tracks.find(t => t.instrument === 'bass');
	const guitarTrack = tracks.find(t => t.instrument === 'guitar');

	if (!bassTrack && !guitarTrack) return [];

	const bassBeats   = bassTrack?.beats   ?? [];
	const guitarBeats = guitarTrack?.beats ?? [];

	const maxBar = Math.max(
		...bassBeats.map(b => b.barIndex),
		...guitarBeats.map(b => b.barIndex),
		-1,
	);

	if (maxBar < 0) return [];

	const merged: AnalysisBeat[] = [];

	for (let bi = 0; bi <= maxBar; bi++) {
		const bassNotes  = [...new Set(bassBeats.filter(b => b.barIndex === bi).flatMap(b => b.bassNotes))];
		const guitarInBar = guitarBeats.filter(b => b.barIndex === bi);

		if (guitarInBar.length > 0) {
			for (const gb of guitarInBar) {
				merged.push({ barIndex: bi, bassNotes, chordName: gb.chordName, parsedChord: gb.parsedChord });
			}
		} else if (bassNotes.length > 0) {
			merged.push({ barIndex: bi, bassNotes, chordName: null, parsedChord: null });
		}
	}

	return merged;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseAttrs(s: string): Record<string, string> {
	const attrs: Record<string, string> = {};
	for (const m of s.matchAll(/(\w+)=([^\s}]+)/g)) {
		if (m[1] && m[2]) attrs[m[1]] = m[2];
	}
	return attrs;
}
