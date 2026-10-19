# Explanation: Design decisions and gotchas

Non-obvious choices in the code and the reasons for them.

## No WAL mode

SQLite's WAL mode creates `-wal` and `-shm` files next to the database. Because users handle their `.sng` files directly (copy, send, back up), the app keeps the default journal mode so that a songbook is always one self-contained file. "Save As" copies the open file with `db.backup`, which produces a consistent copy.

## Unicode-aware sorting and search

better-sqlite3 has no `.collation()` API, and SQLite's `NOCASE` and `LIKE` only handle ASCII. For correct behaviour with umlauts and other letters, `db/connection.ts` registers two custom SQL functions:

- `sort_key` for ordering songs, categories and interpreters,
- `unicode_contains` for the "contains" search.

Uniqueness of category and interpreter names is also checked in JavaScript with the same normalisation (`normalizeName`). The `COLLATE NOCASE` unique index remains as a safety net for ASCII.

## Search from 3 characters

One- and two-letter terms match almost everything and would only cause list flicker. Below the minimum, the list falls back to the sidebar selection. Search is global on purpose: when the user types a term, they want to find the song wherever it is.

## Import skips duplicates, nothing else

Duplicates are songs with the same title and the same set of interpreters. Text differences are not compared. This is a simple and predictable rule, but it cannot update changed songs. Other strategies are listed in the [roadmap](roadmap-and-known-gaps.md).

Invalid songs do not abort the import: valid songs are imported in one transaction and the invalid ones are reported with a reason.

## Chord diagrams are generated, not stored

The diagrams are drawn from the text of the song, so the song file does not store any chord data. A change to the chords text is reflected the next time the preview opens, and old songs get diagrams without a migration.

**Few shapes, many chords.** Writing a fingering for every root and chord type by hand would mean about 150 entries, each a chance for a typo. Instead, the code has a short table of open-position chords that are not an E or A shape (C, D, G and a few more), plus two movable shapes per chord type, based on the E and A forms. Moving a shape up the neck gives the barre chords for every root. At fret 0 the same shapes are the open chords of E and A, so those need no table entry. The same data feeds the song preview, which uses one fingering per chord, and the lookup page, which lists all of them.

**Strict and lenient reading.** Free text on a chords line, such as "A bridge to cross", would be read as the chord `A` plus words. To avoid false diagrams, a line with a label (`Verse: ...`) is read leniently, and a line without a label has to consist of chords only. The label is the user's way of saying "this line contains chords".

**No guessing.** A chord that is valid but has no standard fingering, such as `Cm7b5`, is listed as "No diagram" instead of getting an approximated shape. A wrong diagram is worse than none.

**Diagrams use the text colour.** The SVG draws with `currentColor`, so one component serves the dark and the light theme and prints black on white without extra CSS.

## Tabs are drawn on the character grid of the text

A tab is stored as the text the user typed. The preview detects it and draws it, and the song file never contains drawing data, so the text stays editable, searchable and exportable like any other lyrics.

**No musical interpretation.** The parser does not read timing, tuning or note lengths. Each character position is one column, and a number is drawn at the column where it was typed. Notes that line up in the text line up in the drawing, which is exactly what tab writers rely on. This also means one rule covers every tab style, including ones with unusual symbols.

**Strict detection, silent fallback.** A tab needs 4 to 8 consecutive lines made only of tab characters, with a string name or a leading bar, and at least three dashes per line. Lyrics such as "A - b - c" or "Bridge --- chorus" contain other letters and are rejected. Anything that does not qualify stays ordinary text, so a mistake never hides content.

**Rows break at bar lines.** A tab wider than 56 columns would be scaled down until the numbers were unreadable on A4. Instead the tab is split at bar lines into rows of at most 56 columns, which keeps the numbers at roughly the same size as the lyrics. All rows use the same scale. A row never splits across a page when printed.

**Tabs are kept out of font fitting.** The lyrics font is fitted so that the longest line fits the page. Tab lines are very long and would make the lyrics small, so only text lines are measured.

## Print sheet and font fitting

The sheet uses monospace fonts, because chords are aligned above lyrics with spaces. To avoid line wrapping, which would break the alignment, the font size is calculated from the longest line so that it fits the page width, clamped between 1 rem and 1.5 rem (`MAX_FONT_REM` in `SongPreview.tsx`). The calculation assumes A4 paper with 18 mm margins (`PRINT_CONTENT_WIDTH_PX = 657`). On Letter paper the margins differ and the result has not been verified.

Printing is always black on white so that a user of the dark theme does not waste ink.

## Content Security Policy only in production

The CSP is injected by a Vite plugin in `electron.vite.config.ts` only for production builds. The development server needs inline scripts for HMR, which a strict CSP would block.

## Dependency placement

`react`, `react-dom` and `react-select` are dev dependencies because Vite bundles them into the renderer. `zod`, `drizzle-orm` and `better-sqlite3` are runtime dependencies because the main process loads them from `node_modules`. This keeps the packaged app small.

## Missing `electron.exe` after install

npm 11 skips install scripts. If Electron's binary is missing, run `node node_modules/electron/install.js` (see [How to build, test and package](how-to-build-and-package.md#fix-a-missing-electron-binary)).

## Settings location

Settings are stored in `settings.json` in the Electron user data folder, which is named `simplelyrics` (on Windows: `%APPDATA%\simplelyrics`). They are deliberately not stored in the songbook, because they belong to the user and the machine, not to the songs.

## Testing the UI

Automated tests cover the data layer. UI checks were done by starting the built app with `--remote-debugging-port` and a throwaway `--user-data-dir`, and driving it over the Chrome DevTools protocol from a Node script. Native file and print dialogs cannot be driven this way and must be checked by hand.
