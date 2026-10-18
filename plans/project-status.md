# SimpleLyrics – Project Status

Snapshot for continuing in a new session (2026-10-18). Original requirements: [criterias/first-criterias.md](../criterias/first-criterias.md). Original plan: [implementation-plan.md](implementation-plan.md).

## What it is

Cross-platform desktop app for guitar players to store songs (title, key, capo, chords, lyrics, interpreters, category) in SQLite files. UI language: English.

## Stack

- Electron 44, electron-vite 6, TypeScript (strict), React 19 (renderer), react-select (`CreatableSelect`)
- better-sqlite3 13 (N-API prebuilds, works in plain Node and Electron), Drizzle ORM + drizzle-kit (migrations in `drizzle/`)
- zod 4 (IPC validation), Vitest 5, electron-builder (Win NSIS, macOS dmg, Linux AppImage/deb; only the Windows `--dir` build was verified)

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Dev mode with HMR |
| `npm test` | Vitest (25 tests: repositories, files, export/import) |
| `npm run typecheck` / `npm run build` | Typecheck / typecheck + production build |
| `npm run pack` | Unpacked Windows build in `dist/win-unpacked` |
| `npm run dist:win` / `dist:mac` / `dist:linux` | Installers |
| `npm run db:generate` | New migration after changing `src/main/db/schema.ts` |

## Implemented

- **Files:** each database is a `.sng` SQLite file. New / Open / Recent / Save As (copy via `db.backup`). Last file is reopened on start, otherwise a welcome screen. Foreign SQLite files are rejected (`app_meta` check). Window title shows the file name. `.sng` file association is configured in electron-builder, plus handling of argv / `open-file` / second instance.
- **Data:** `categories`, `interpreters`, `songs`, `song_interpreters` (n:m), `app_meta`. A song has 0..1 category, 0..n interpreters. Key / original key up to 10 chars, first line 100, chords 2000, capo 0–12 (default 0), song text unlimited. Case-insensitive unique names (checked in JS, Unicode-aware).
- **Sidebar:** tabs Categories / Interpreters (mutually exclusive), each with "All songs" and a virtual "(No category)" / "(No interpreter)" entry, with counts. Add / rename / delete with confirmation. Deleting a category moves its songs to "(No category)". Deleting an interpreter only removes the links.
- **Song list:** scrollable, two-line rows (title, interpreters, category, capo; first line smaller below). Double-click or Enter edits, Delete key deletes (with confirmation).
- **Search:** from 3 characters, on every keystroke, "contains" in title and first line, global (ignores the sidebar), Unicode-aware.
- **Song editor:** replaces the whole window content. Fields incl. `CreatableSelect` for category (single) and interpreters (multi); unknown names are created automatically in one transaction. Only Cancel / Save (Esc = cancel, discard prompt if dirty). Chords textarea is not resizable.
- **Toolbar (icons, tooltips):** left: New file, Open file, Save file as | New song, Edit song, Delete song | Preview song, Print song. Right: Export songs, Import songs | Dark/Light switch. Song buttons depend on selection; while editing everything except Delete (existing song) and the theme switch is disabled. Native menu has the same commands (File, Songs, View).
- **Theme:** dark (default) / light, saved in settings.
- **Export / import JSON:** format `simplelyrics-songs` v1 (songs reference category/interpreters by name, optional lists of empty categories/interpreters). Import is all-or-nothing in one transaction, but invalid songs are skipped and reported while valid ones are imported. Duplicate = same title (case-insensitive) + same set of interpreters → skipped (text differences are not compared). Result shown in a message box.
- **Preview / print:** preview sheet follows the theme on screen; printing uses the system dialog (`webContents.print`) and is always black on white (`@media print`, 18 mm margins). Sheet layout: title (26px), interpreters left and "Capo: N" right (only if capo > 0; 14px), rule, chords (bold, monospace), song text (monospace). Chords/text font is auto-fitted so the longest line fits the page width, between 1rem and 1.5rem (`MAX_FONT_REM` in `SongPreview.tsx`; print width assumes A4 with 18 mm margins, `PRINT_CONTENT_WIDTH_PX = 657`).

## Code map

- `src/main/` – `index.ts` (window, startup), `files.ts` (current file, dialogs), `settings.ts` (userData `settings.json`), `menu.ts`, `printing.ts`, `transferFiles.ts` (export/import dialogs), `db/` (schema, connection), `repositories/` (songs, categories, interpreters, transfer), `ipc/` (handlers, zod validation)
- `src/preload/index.ts` – typed `window.api` bridge
- `src/shared/types.ts` – DTOs, limits, API interface, export format
- `src/renderer/src/` – `App.tsx` (state, views: list / edit / preview), `components/` (Toolbar, Icons, Sidebar, SongTable, SongEditor, SongPreview, dialogs, WelcomeScreen), `styles.css`
- `tests/` – `repositories.test.ts`, `transfer.test.ts`

## Decisions and gotchas

- No WAL mode (avoids `-wal` / `-shm` files next to the user's `.sng`).
- better-sqlite3 has no `.collation()`; Unicode-aware sorting and search use custom SQL functions `sort_key` and `unicode_contains` registered in `db/connection.ts`.
- npm 11 skips install scripts: if `electron.exe` is missing run `node node_modules/electron/install.js`.
- react, react-dom and react-select are devDependencies (bundled by Vite); zod, drizzle-orm and better-sqlite3 are runtime dependencies.
- CSP is injected only into production builds (Vite plugin in `electron.vite.config.ts`).
- Settings live in `%APPDATA%\simplelyrics\settings.json` (userData name is `simplelyrics`).
- UI smoke-test method used so far: start the built app (`node_modules\electron\dist\electron.exe .`) with `--remote-debugging-port` and a throwaway `--user-data-dir`, then drive it over the DevTools protocol from a Node script. Native file/print dialogs cannot be driven this way.
- Lyrics policy: only public-domain lyrics are written by the assistant (from memory, so they need proofreading); copyrighted text must be pasted in by the user.

## Data in use

- User's working file: `D:\__Dev\Songs.sng` (contains "Test 1" plus all 15 songs of `irish-folk-songs.json`, category "Irish folk", interpreter "Traditional").
- [plans/irish-folk-songs.json](irish-folk-songs.json): importable export with 15 Irish folk songs (already imported into `Songs.sng`; Molly Malone, Whiskey in the Jar, The Black Velvet Band, Danny Boy, Seven Drunken Nights (all 7 nights from a "traditional" PDF), The Rocky Road to Dublin, The Star of the County Down, The Irish Rover, Finnegan's Wake, The Leaving of Liverpool, The Rattlin' Bog, Drunken Sailor, I'll Tell Me Ma, The Spanish Lady, The Wild Rover). Chords and some verses are from memory / best guess (e.g. the Spanish Lady chorus). Song list and notes: [irish-folk-songs.md](irish-folk-songs.md).
- Not yet added (texts not known reliably): Step It Out Mary (user has chords only), Mursheen Durkin, The Galway Races, The Old Woman from Wexford, The Rare Old Mountain Dew.

## Open items / ideas

- Manually verify (not covered by automated checks): New / Open / Save As dialogs, delete confirmations for categories/interpreters, export/import dialogs, the real print output (also on Letter paper, where margins differ), light theme everywhere, keyboard shortcuts (Ctrl+N, Ctrl+F, Ctrl+P, Ctrl+Shift+P).
- Packaging for macOS and Linux is configured but untested; no app icon yet (default Electron icon); no code signing or auto-update.
- Import conflict handling is "skip" only; alternatives discussed: update existing, keep both when content differs, ask per song.
- Possible extras: sort by column, chord transposition, printing several songs, a "key" display on the print sheet.
