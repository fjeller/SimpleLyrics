# Reference: Commands, stack and code map

## npm scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Development mode with HMR |
| `npm start` | Preview of the built app (`electron-vite preview`) |
| `npm test` | Vitest, single run (25 tests: repositories, files, export/import) |
| `npm run typecheck` | Typecheck for main (`tsconfig.node.json`) and renderer (`tsconfig.web.json`) |
| `npm run build` | Typecheck and production build into `out/` |
| `npm run pack` | Build and create an unpacked Windows app in `dist/win-unpacked` |
| `npm run dist:win` / `dist:mac` / `dist:linux` | Build and create installers |
| `npm run db:generate` | Generate a migration after changing `src/main/db/schema.ts` |

`postinstall` runs `electron-builder install-app-deps` to rebuild native modules for Electron.

## Stack

| Area | Technology |
|---|---|
| Shell | Electron 44, electron-vite 6 |
| Language | TypeScript (strict) |
| UI | React 19, react-select (`CreatableSelect`) |
| Database | better-sqlite3 13 (N-API prebuilds, works in Node and Electron) |
| ORM and migrations | Drizzle ORM, drizzle-kit |
| Validation | zod 4 |
| Tests | Vitest 5 |
| Packaging | electron-builder (NSIS, dmg, AppImage, deb) |

The runtime dependencies are `better-sqlite3`, `drizzle-orm` and `zod`. React, react-dom and react-select are dev dependencies, because Vite bundles them.

## Code map

### `src/main/` (main process)

| Path | Responsibility |
|---|---|
| `index.ts` | Window creation, startup, file opening from argv / `open-file` / second instance |
| `files.ts` | Current file, New / Open / Recent / Save As dialogs |
| `settings.ts` | `settings.json` in the user data folder |
| `menu.ts` | Native menu |
| `printing.ts` | System print dialog |
| `transferFiles.ts` | Export and import dialogs |
| `errors.ts` | `UserError` for messages shown to the user |
| `db/schema.ts`, `db/connection.ts` | Drizzle schema, connection, migrations, custom SQL functions |
| `repositories/` | `songs.ts`, `categories.ts`, `interpreters.ts`, `transfer.ts` |
| `ipc/handlers.ts`, `ipc/validation.ts` | IPC handlers and zod schemas |

### Other source folders

| Path | Responsibility |
|---|---|
| `src/preload/index.ts` | Typed `window.api` bridge |
| `src/shared/types.ts` | DTOs, limits, API interface, export format |
| `src/renderer/src/App.tsx` | State and views (list, edit, preview) |
| `src/renderer/src/api.ts` | Access to `window.api` |
| `src/renderer/src/components/` | `Toolbar`, `Icons`, `Sidebar`, `SongTable`, `SongEditor`, `SongPreview`, `SearchBar`, `Dialogs`, `NameEditDialog`, `WelcomeScreen` |
| `src/renderer/src/styles.css` | Styles, including `@media print` |
| `tests/` | `repositories.test.ts`, `transfer.test.ts` |
| `drizzle/` | SQL migrations and snapshots |

### Configuration files

| File | Purpose |
|---|---|
| `electron.vite.config.ts` | Build config, production-only CSP plugin |
| `electron-builder.yml` | Packaging, `.sng` association |
| `drizzle.config.ts` | drizzle-kit config |
| `vitest.config.mts` | Test config |
