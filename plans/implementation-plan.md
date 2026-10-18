# SimpleLyrics – Implementation Plan (Phase 1)

Source: [criterias/first-criterias.md](../criterias/first-criterias.md)
Printing is out of scope for this phase.

## 0. Pre-check (done)

`better-sqlite3` was verified in an isolated spike (outside the workspace):

| Item | Version / Result |
|---|---|
| Node | 24.22.0 |
| npm | 11.19.1 |
| Python | 3.15.0 |
| Electron | 44.9.0 (ABI 149) |
| better-sqlite3 | 13.0.3 |
| @electron/rebuild | 4.2.1 – "Rebuild Complete" |
| Runtime test in Electron main process | `SQLITE_RESULT { x: 'ok', v: '3.53.4' }` |

Result: native build and loading inside Electron works. Use these versions (or newer compatible) as baseline.

## 1. Decisions (from clarification)

| Topic | Decision |
|---|---|
| Category per song | 0..1 (nullable FK on song) |
| Interpreters per song | 0..n via junction table (n:m) |
| Key / Original Key | Free text, max 10 chars |
| Multiple DB files | In scope: New / Open / Recent / Save As (copy) |
| File extension | `.sng` (note: also used by SongBeamer; only relevant for OS file association) |
| Startup | Reopen last used file; if none/missing → welcome screen (New / Open / Recent) |
| Search | Global (ignores sidebar), starts at 3 chars, on every keystroke, `contains` in Title + FirstLine |
| Sidebar | Tabs "Categories" / "Interpreters", mutually exclusive; each list has "All songs" (default) + virtual entry ("(No category)" / "(No interpreter)") |
| Song editor | Double-click (or "New") opens an editor view replacing the list; Save / Cancel / Back |
| Interpreter delete | Remove relations only; songs stay |
| Category delete | Songs get `category_id = NULL` (→ "(No category)") |
| Theme | Dark (default) + Light, persisted |
| UI language | English only |

## 2. Tech Stack

- **Electron 44** + **electron-vite** (main / preload / renderer builds, HMR)
- **TypeScript** (strict) everywhere
- **React 19** renderer
- **better-sqlite3** (main process only) + **Drizzle ORM** + **drizzle-kit** (migrations)
- **react-select** (`CreatableSelect`) for interpreters (multi) and category (single)
- **zod** for IPC payload validation in main process
- **electron-builder** for packaging (Win NSIS, macOS dmg, Linux AppImage/deb)
- **Vitest** for unit tests of the data layer (repositories against in-memory/temp DB)
- Styling: plain CSS modules + CSS variables for theming (no heavy UI library needed)

## 3. Architecture

```
┌──────────── Renderer (React, sandboxed, no Node) ─────────────┐
│ App → Sidebar | SearchBar | SongTable | SongEditor | Dialogs   │
│        uses window.api.* (typed)                               │
└───────────────────────────▲───────────────────────────────────┘
                            │ contextBridge (preload)
┌───────────────────────────┴───────────────────────────────────┐
│ Main process                                                   │
│  ipc/handlers.ts  (zod-validated)                              │
│  db/connection.ts (open/close/switch file, run migrations)     │
│  db/schema.ts     (Drizzle)                                    │
│  repositories/    songs, categories, interpreters              │
│  settings.ts      (recent files, last file, theme → userData)  │
│  menu.ts          (File: New/Open/Recent/Save As/Exit, View)   │
└────────────────────────────────────────────────────────────────┘
```

Security: `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`, strict CSP, only explicit IPC channels exposed, all inputs validated in main.

### Folder structure

```
src/
  main/
    index.ts            app lifecycle, window
    menu.ts
    settings.ts
    db/
      connection.ts
      schema.ts
      migrate.ts
    repositories/
      songs.ts
      categories.ts
      interpreters.ts
    ipc/
      handlers.ts
      validation.ts     zod schemas
  preload/
    index.ts            exposes window.api
  shared/
    types.ts            DTOs + API interface shared by main/preload/renderer
  renderer/
    index.html
    src/
      main.tsx
      App.tsx
      theme/            CSS variables, ThemeProvider
      components/
        Sidebar/
        SearchBar/
        SongTable/
        SongEditor/
        ConfirmDialog/
        WelcomeScreen/
        NameEditDialog/ (rename category/interpreter)
      hooks/
drizzle/                generated migrations (bundled as extraResources)
tests/
```

## 4. Data Model (Drizzle / SQLite)

```ts
categories
  id            integer PK autoincrement
  name          text NOT NULL UNIQUE COLLATE NOCASE

interpreters
  id            integer PK autoincrement
  name          text NOT NULL UNIQUE COLLATE NOCASE

songs
  id            integer PK autoincrement
  title         text NOT NULL                  -- required
  key           text(10) NULL
  original_key  text(10) NULL
  first_line    text(100) NULL
  category_id   integer NULL → categories.id ON DELETE SET NULL
  capo          integer NOT NULL DEFAULT 0 CHECK (capo BETWEEN 0 AND 12)
  song_text     text NULL                      -- unlimited
  chords        text(2000) NULL                -- multiline
  created_at    text NOT NULL DEFAULT CURRENT_TIMESTAMP
  updated_at    text NOT NULL DEFAULT CURRENT_TIMESTAMP

song_interpreters
  song_id        integer → songs.id ON DELETE CASCADE
  interpreter_id integer → interpreters.id ON DELETE CASCADE
  PRIMARY KEY (song_id, interpreter_id)

Indexes: songs(category_id), songs(title), song_interpreters(interpreter_id)
```

Notes:
- SQLite does not enforce `text(n)` lengths → enforce lengths (key 10, first_line 100, chords 2000) via zod in main + `maxLength` in UI; add `CHECK(length(...) <= n)` constraints for safety.
- `PRAGMA foreign_keys = ON` and `PRAGMA journal_mode = WAL` on every open.
- Name uniqueness is case-insensitive; names are trimmed; empty names rejected.
- Store an `app_meta` table (`schema_owner = 'SimpleLyrics'`) to recognize valid files when opening.

## 5. Multiple Database Files

- `connection.ts` holds exactly one active connection; `openFile(path)` closes the current one, opens the new one, sets pragmas, checks `app_meta` (reject foreign SQLite files with a clear message), runs pending Drizzle migrations.
- **New**: save dialog (`*.sng`) → create file → migrate → open.
- **Open**: open dialog (`*.sng`) → open.
- **Recent**: last 10 paths in `settings.json` (userData); missing files removed with notice.
- **Save As**: `db.backup(targetPath)` (better-sqlite3 online backup) → switch to the copy.
- Window title shows current file name.
- Renderer gets an event `db:changed` → reloads all lists.
- Migrations folder shipped via `extraResources`; path resolved by `app.isPackaged`.

## 6. IPC API (`window.api`)

```ts
file:     newFile(), openFile(), openRecent(path), saveAs(), getRecent(), getCurrent()
songs:    list(filter), get(id), create(dto), update(id, dto), delete(id)
categories:   list() (with song counts), create(name), rename(id, name), delete(id)
interpreters: list() (with song counts), create(name), rename(id, name), delete(id)
settings: getTheme(), setTheme(theme)
events:   onDbChanged(cb), onMenuCommand(cb)
```

`SongFilter` = `{ kind: 'all' } | { kind: 'category', id: number | null } | { kind: 'interpreter', id: number | null } | { kind: 'search', term: string }`
(`id: null` = virtual "(No category)" / "(No interpreter)").

`SongDto` for create/update includes `categoryId | null`, `newCategoryName?`, `interpreterIds: number[]`, `newInterpreterNames: string[]`.
Create/update runs in **one transaction**: create missing category/interpreters (or reuse existing by case-insensitive name), insert/update song, replace `song_interpreters` rows.

## 7. Queries

- **List**: songs LEFT JOIN categories, interpreters aggregated via `group_concat(name, ', ')` ordered by name; ordered by title `COLLATE NOCASE`.
- **No interpreter**: `WHERE NOT EXISTS (SELECT 1 FROM song_interpreters WHERE song_id = songs.id)`.
- **No category**: `WHERE category_id IS NULL`.
- **Search**: `title LIKE ? ESCAPE '\' OR first_line LIKE ? ESCAPE '\'` with escaped `%`, `_`, `\`; parameterized only. Executed when term length ≥ 3; below 3 the sidebar filter applies again.
- Sidebar counts: `GROUP BY` queries for categories/interpreters plus counts for virtual entries.

## 8. UI

### Layout
```
┌──────────────────────────────────────────────────────────────┐
│ Menu: File (New, Open, Recent ▸, Save As, Exit) | View (Theme)│
├──────────────┬───────────────────────────────────────────────┤
│ [Categories][Interpreters] │ 🔍 Search…            [+ New song] │
│ All songs (n)│───────────────────────────────────────────────│
│ (No cat.) (n)│ Title – Interpreter(s) – Category – Capo        │
│ Ballads  (n) │   first line (smaller, muted)                   │
│ Rock     (n) │ …scrollable…                                    │
│ [+] [✎] [🗑] │                                                 │
└──────────────┴───────────────────────────────────────────────┘
```

### Components
- **Sidebar**: tab switch; list with counts; selection; add / rename / delete buttons (virtual entries and "All songs" not editable). Switching tab resets selection to "All songs" of that tab.
- **SearchBar**: controlled input; triggers search at ≥ 3 chars on each keystroke (no debounce needed for local SQLite; add ~100 ms if needed); clear button; while searching, sidebar selection is visually de-emphasized.
- **SongTable**: scrollable, sticky header, two-line rows (line 1: Title | Interpreter(s) | Category | Capo; line 2: first line in smaller muted text). Single-click select, double-click / Enter → editor, Delete key → delete with confirmation. Use virtualization (`react-window`) only if performance requires it.
- **SongEditor** (replaces table area): Title*, Key, Original Key, Capo (number 0–12, default 0), Category (`CreatableSelect` single, clearable), Interpreters (`CreatableSelect` multi, chips), First Line, Chords (textarea, 2000), Song Text (large textarea, monospace option). Save / Cancel / Back; unsaved-changes prompt; delete button with confirmation for existing songs.
- **ConfirmDialog**: reusable for all deletes (texts state consequences, e.g. "12 songs will move to (No category)").
- **NameEditDialog**: add/rename category or interpreter, duplicate check feedback.
- **WelcomeScreen**: New / Open / Recent list, shown when no file is open.
- **Theme**: CSS variables for dark/light, `react-select` styled via its `styles`/`theme` props to match; persisted in settings; default dark.

## 9. Implementation Steps

1. **Scaffold** – `npm create @quick-start/electron` (react-ts template) in the workspace; add better-sqlite3, drizzle-orm, drizzle-kit, zod, react-select, electron-builder, @electron/rebuild, vitest. Configure `postinstall: electron-builder install-app-deps`, mark better-sqlite3 external for main build, `asarUnpack` for `*.node`. **Gate: app starts and a test query via better-sqlite3 runs in main.**
2. **Schema & migrations** – Drizzle schema, `drizzle.config.ts`, generate initial migration, `migrate.ts`, `app_meta` check.
3. **Connection & file handling** – open/close/switch, New/Open/Recent/Save As, settings.json, window title, application menu.
4. **Repositories** – songs, categories, interpreters incl. transactional create/update with auto-creation; unit tests with Vitest on temp DB files.
5. **IPC + preload** – shared types, zod validation, typed `window.api`, events.
6. **Renderer shell** – layout, theme provider (dark default), welcome screen.
7. **Sidebar** – tabs, lists with counts, virtual entries, CRUD with confirmation.
8. **Song table + search** – filter wiring, two-line rows, search behavior.
9. **Song editor** – form, validation, CreatableSelects, save/cancel/delete, unsaved-changes guard.
10. **Polish** – keyboard shortcuts (Ctrl/Cmd+N new song, Ctrl/Cmd+F search, Del delete), empty states, error toasts.
11. **Packaging** – electron-builder config for Win/macOS/Linux, `.sng` file association, verify better-sqlite3 in packaged build on Windows.

## 10. Acceptance Checklist

- [ ] App builds and runs with better-sqlite3 in dev and packaged mode
- [ ] Create, open, switch, Save As `.sng` files; last file reopened on start; welcome screen otherwise
- [ ] Songs CRUD incl. delete confirmation; title required; capo 0–12 default 0; length limits enforced
- [ ] Categories CRUD; delete with confirmation moves songs to "(No category)"
- [ ] Interpreters CRUD; delete with confirmation removes relations only
- [ ] New category/interpreter typed in the editor is created automatically and linked
- [ ] Sidebar tabs mutually exclusive, "All songs" + virtual entries work
- [ ] Search from 3 chars, per keystroke, contains in Title + FirstLine, global
- [ ] Song list two-line rows, scrollable
- [ ] Dark (default) / light theme, persisted

## 11. Later Phases

- Printing (song sheet layout via `webContents.print` / `printToPDF`)
- Possible extras: transpose chords, import/export, sorting by columns
