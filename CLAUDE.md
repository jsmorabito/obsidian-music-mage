# Obsidian Music Mage — CLAUDE.md

Developer context for AI-assisted work on this codebase.

---

## What this is

An Obsidian desktop plugin providing music theory reference tools and song analysis.
All features are offline-only. No network requests. Desktop only (`isDesktopOnly: true`).

GitHub: https://github.com/jsmorabito/Obsidian-Music-Mage

---

## Commands

```bash
npm install       # install deps
npm run dev       # esbuild watch (no type-check, inline sourcemap)
npm run build     # tsc type-check + esbuild production bundle → main.js
npm run lint      # ESLint
```

After every build, reload the plugin in Obsidian:
**⌘P → "Reload app without saving"**, or toggle off/on in Settings → Community plugins.

---

## Project layout

```
src/
  main.ts                    Plugin entry — registers views, commands, settings, directive handler
  settings.ts                MusicMageSettings interface, DEFAULT_SETTINGS, MusicMageSettingTab
  directives-api.ts          Copied public API from obsidian-directives (do not hand-edit)

  # Music theory engine
  chords.ts                  Chord types, interval data, parseChord(), getNotesForRoot()
  scales.ts                  Scale types (15 scales), buildScale(), CATEGORIES

  # Song feature
  song.ts                    SongMeta/SongSection types, parseSongDirectives(),
                             parseChordBody(), metaFromFrontmatter()
  ChordMap.ts                Chord map rendering engine — CoF Y-axis, □/◊ symbols,
                             sectionsToPoints(), inputToPoints(), renderChordMap(), renderLegend()

  # Views (ItemView — sidebar panels)
  CircleOfFifthsView.ts      Interactive SVG circle of fifths
  ChordDictionaryView.ts     Chord search + browse by root
  ScaleExplorerView.ts       Scale browser with piano diagram + diatonic chords
  SongAnalysisView.ts        Live song panel — reads active note's frontmatter + directives;
                             includes compact Chord Map at bottom; requires plugin instance
  ChordMapView.ts            Full Chord Map view — Note tab (active file) + Manual Input tab;
                             requires plugin instance for settings

  # Theory engine
  theory/fretboard.ts        TUNINGS map, fret+string → MIDI → pitch class → note name, tab line parser
  theory/keyDetect.ts        Score 24 keys (12 major + 12 minor), return top 3 candidates with chord breakdown

  # Track feature
  TrackParser.ts             Parse :::track directives from raw text, build score groups, merge bass+guitar beats
  TrackDirectiveHandler.ts   :::track CM6 inline widget — renders tab or chord row

  # Directive handler
  SongDirectiveHandler.ts    :::song CM6 inline widget (requires obsidian-directives)

styles.css                   All plugin CSS (Obsidian CSS vars only, no hardcoded colours)
manifest.json                id: obsidian-music-mage
```

---

## Settings

Stored in `data.json` via `loadData()`/`saveData()`. Schema in `src/settings.ts`.

| Key | Type | Default | Description |
|---|---|---|---|
| `chordMapColorsEnabled` | boolean | `false` | Color-code sections in the Chord Map |
| `sectionColors` | string[] | 8 hex colors | One color per section (cycles); customizable via color pickers in settings tab |
| `trackAlignment` | `'bar' \| 'beat'` | `'bar'` | How to pair bass notes with chords: bar-level (by `\|` segment) or beat-level (by column position) |

---

## Features

### Circle of Fifths (`circle-of-fifths-view`)

- SVG with outer ring (major keys) and inner ring (relative minors)
- Click any segment to select it; click again to deselect
- Clicking a key shows: key signature (sharps/flats count) + diatonic chord table
- Ribbon icon: `music`

### Chord Dictionary (`chord-dictionary-view`)

- **Search mode**: type a chord name (e.g. `Cm7`, `F♯maj7`, `Bbsus4`) — live parse + display
- **Browse mode**: click a root note button → shows all 18 chord types for that root
- Each chord card shows: chord name, full name, notes per degree with interval names (R, M3, etc.)
- Chord engine lives in `chords.ts`; handles all 12 roots × 18 types, sharp/flat spelling by root
- Ribbon icon: `book-open`

### Scale Explorer (`scale-explorer-view`)

- 14 roots × 15 scales across 5 categories: Diatonic, Minor, Pentatonic, Blues, Symmetric
- Category tabs filter the scale list; selected scale shows result panel
- Result panel: title, one-octave piano diagram (scale tones highlighted, root solid), degree/note/interval table, diatonic chord grid (where applicable)
- Scale engine in `scales.ts`; piano layout via CSS `--gap-index` custom property on black keys
- Ribbon icon: `layout-list`

### Song Analysis (`song-analysis-view`)

- Sidebar panel that watches the active leaf and refreshes on file modify / metadata change
- Reads **frontmatter** for: `title`, `artist`, `key`, `tempo`, `time`, `genre`
- Reads **`:::song` directives** from note body for chord sections (requires obsidian-directives)
- Displays: song header (title + artist + genre), key/BPM/time badges, per-section chord grids
- Shows a "no song data" hint if none of the above fields are present
- Ribbon icon: `file-music`

### Chord Map (`chord-map-view`)

Inspired by [SeeChord](https://www.seechord.co.uk) — plots a chord progression on a grid where:
- **Y-axis**: circle-of-fifths position (C at top → F at bottom), so harmonically close chords appear near each other
- **X-axis**: time (one column per chord)
- **□ square** = major-quality chord; **◊ diamond** = minor/diminished chord
- Consecutive chords within a section are connected with a line

**Two tabs:**
- *Active note* — reads `:::song` directives from the current file, auto-refreshes on edit
- *Manual input* — free-text textarea (same `|`-separated bar format as :::song body), renders on button click

**Compact version** is also embedded at the bottom of the Song Analysis panel (smaller cell size, no X labels).

**Colors** (off by default, toggle in Settings → Music Mage):
- When enabled: each section gets its own color (line + symbol stroke + translucent fill)
- Colors are fully customizable per-slot via color pickers in settings
- Colors cycle if the song has more sections than color slots
- Single-section Manual Input mode ignores color setting (monochrome)

Rendering engine: `ChordMap.ts` → `renderChordMap()` / `renderLegend()`
- `sectionsToPoints()` converts `SongSection[]` → `ChordPoint[]`
- `inputToPoints()` parses free-form text → `ChordPoint[]`
- Both views pass a `ChordMapOptions` object `{ colorsEnabled, sectionColors, compact? }`
- Ribbon icon: `git-fork`

#### `:::song` directive (via obsidian-directives integration)

Renders inline chord-progression widgets in the live editor:

```
:::song[Section Name]
Cmaj7 | Am7 | Fmaj7 | G7
Dm7   | G7  | Cmaj7 | .
:::
```

- `|` separates bars; `.` is a rest/placeholder (filtered out)
- `//` and `#` prefix lines are treated as comments and skipped
- Handler registered via `getDirectivesAPI(app).addHandler(...)` — gracefully skipped if obsidian-directives is not installed/enabled

---

### Track Directives & Key Detection

#### `:::track` directive (via obsidian-directives)

Renders inline bass tab or guitar chord widgets in the live editor. Both `:::track` blocks with the same `score=` label are grouped together for key analysis.

**Bass tab syntax:**
```
:::track[Verse Bass]{score=verse instrument=bass tuning=EADG}
G|--0--3--|--5--3--|
D|--0--0--|--0--0--|
A|--2--2--|--2--2--|
E|--0--0--|--0--0--|
:::
```

**Guitar chord syntax:**
```
:::track[Verse Guitar]{score=verse instrument=guitar}
Am | F | C | G
:::
```

**Attributes:** `instrument=bass|guitar`, `score=<label>` (groups tracks for analysis), `tuning=EADG|EADGBE|BEADG|DADGBE` (default: EADG for bass, EADGBE for guitar)

#### Key Detection (Song Analysis sidebar)

When a note contains `:::track` directives, the Song Analysis panel shows a **Key Detection** section with:
- Top 3 key candidates (major or minor) with confidence percentage + bar chart
- Chord breakdown table for the best match: chord name, Roman numeral, bass note, inversion tag (root pos., 1st inv., 2nd inv., ⚠ outside)
- Most frequent bass note (independent of key scoring)

**Scoring weights:**
- 60% chord fit (diatonic quality match)
- 32% bass note fit (in-scale fraction)
- 8% tonic bonus (dominant bass note = key root)

**Source files:** `src/theory/fretboard.ts`, `src/theory/keyDetect.ts`, `src/TrackParser.ts`, `src/TrackDirectiveHandler.ts`

---

## External dependency: obsidian-directives

- The `:::song` inline widget only works when the [obsidian-directives](https://github.com/jsmorabito/obsidian-directives) plugin is installed and enabled
- The Song Analysis sidebar parses `:::song` blocks from raw file text independently — it does **not** require obsidian-directives to work
- `directives-api.ts` is a verbatim copy of `obsidian-directives/src/api.ts`. When the directives plugin updates its API, re-copy that file

---

## CSS conventions

- All colours use Obsidian CSS variables (`var(--color-accent)`, `var(--text-normal)`, etc.)
- All classes prefixed with `mm-` to avoid collisions
- `color-mix()` used for tinted backgrounds (requires modern browser — Obsidian ships Electron with Chromium)
- Piano black key positioning uses `--gap-index` CSS custom property set inline

---

## TypeScript notes

- `tsconfig.json` has `"strict": true` and `"noUncheckedIndexedAccess": true`
- Array index reads return `T | undefined` — guard or cast with `as string` where the index is provably in-bounds
- `@codemirror/state` and `@codemirror/view` are devDependencies for types only — they are external in esbuild and provided by Obsidian at runtime
- The `getDirectivesAPI()` helper casts through `unknown` to access the plugin instance — this is the documented pattern from the directives API

---

## Adding a new feature

1. Create `src/MyFeatureView.ts` extending `ItemView`
2. Export a `MY_FEATURE_VIEW = 'my-feature-view'` constant
3. In `main.ts`: `this.registerView(...)`, `this.addRibbonIcon(...)`, `this.addCommand(...)`, and `this.app.workspace.detachLeavesOfType(...)` in `onunload()`
4. Add CSS to `styles.css` with `mm-` prefixed classes
5. Update this `CLAUDE.md`

---

## Known limitations / future work

- Piano diagram shows only one octave starting at C; does not scroll to show the selected root
- Scale Explorer diatonic chord grid only shows triads, not 7th chords
- `:::song` directive only renders in live editor (CM6); reading mode shows raw Markdown
- No MIDI playback
- No mobile support (`isDesktopOnly: true`)
