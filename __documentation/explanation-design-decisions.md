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
