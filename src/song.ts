export interface SongMeta {
	title: string;
	artist?: string;
	key?: string;
	tempo?: number;
	time?: string;
	genre?: string;
}

export interface SongSection {
	label: string;
	bars: string[][];   // bars[i] = chord names in that bar
}

export interface SongData {
	meta: SongMeta;
	sections: SongSection[];
}

/** Parse :::song directives from raw file text. */
export function parseSongDirectives(text: string): SongSection[] {
	const sections: SongSection[] = [];
	const lines = text.split('\n');
	let i = 0;

	while (i < lines.length) {
		const line = lines[i] ?? '';
		const openMatch = line.match(/^:::song(?:\[([^\]]*)\])?/);
		if (!openMatch) { i++; continue; }

		const label = openMatch[1]?.trim() ?? 'Section';
		const bodyLines: string[] = [];
		i++;

		while (i < lines.length && (lines[i] ?? '').trimStart() !== ':::') {
			bodyLines.push(lines[i] ?? '');
			i++;
		}
		i++; // skip closing :::

		const bars = parseChordBody(bodyLines);
		if (bars.length > 0) sections.push({ label, bars });
	}

	return sections;
}

/**
 * Parse chord body lines into bars.
 * Each non-empty line is a "row"; chords within a row separated by | become bars.
 * Empty/comment lines are skipped.
 */
export function parseChordBody(lines: string[]): string[][] {
	const bars: string[][] = [];

	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) continue;

		const barStrings = trimmed.split('|');
		for (const barStr of barStrings) {
			const chords = barStr.trim().split(/\s+/).filter(c => c && c !== '.');
			if (chords.length > 0) bars.push(chords);
		}
	}

	return bars;
}

function fmStr(v: unknown): string | undefined {
	if (typeof v === 'string') return v;
	if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'bigint') return String(v);
	return undefined;
}

export function isSongFile(
	meta: SongMeta,
	sections: SongSection[],
	frontmatter: Record<string, unknown> | null,
	tagKey: string,
	tagValue: string,
): boolean {
	if (tagKey !== '' && frontmatter != null && fmStr(frontmatter[tagKey]) === tagValue) return true;
	return !!(meta.key || meta.tempo || meta.time || meta.artist || sections.length > 0);
}

export function metaFromFrontmatter(fm: Record<string, unknown> | null | undefined): SongMeta {
	if (!fm) return { title: 'Untitled' };
	return {
		title:  fmStr(fm['title']) ?? fmStr(fm['name']) ?? 'Untitled',
		artist: fmStr(fm['artist']),
		key:    fmStr(fm['key']),
		tempo:  fm['tempo']   != null ? Number(fm['tempo'])   : undefined,
		time:   fmStr(fm['time']),
		genre:  fmStr(fm['genre']),
	};
}
