# Reference: Data model and limits

## Songbook file

A songbook is a SQLite database with the extension `.sng`. The app creates the schema on a new file and rejects other SQLite files: a valid file contains an `app_meta` table with `schema_owner` set by SimpleLyrics.

The database runs without WAL mode, so no `-wal` or `-shm` files appear next to the `.sng` file.

## Tables

Source: [src/main/db/schema.ts](../src/main/db/schema.ts).

### `app_meta`

| Column | Type | Notes |
|---|---|---|
| `key` | text | Primary key |
| `value` | text | Not null |

### `categories` and `interpreters`

| Column | Type | Notes |
|---|---|---|
| `id` | integer | Primary key, autoincrement |
| `name` | text | Not null, unique index with `COLLATE NOCASE` |

### `songs`

| Column | Type | Notes |
|---|---|---|
| `id` | integer | Primary key, autoincrement |
| `title` | text | Not null |
| `key` | text | Nullable, max 10 characters |
| `original_key` | text | Nullable, max 10 characters |
| `first_line` | text | Nullable, max 100 characters |
| `category_id` | integer | Nullable, references `categories.id`, on delete set null |
| `capo` | integer | Not null, default 0, check 0–12 |
| `song_text` | text | Nullable, unlimited |
| `chords` | text | Nullable, max 2000 characters |
| `created_at` | text | Default `CURRENT_TIMESTAMP` |
| `updated_at` | text | Default `CURRENT_TIMESTAMP` |

Indexes: `songs_category_idx` on `category_id`, `songs_title_idx` on `title`.

### `song_interpreters`

Links songs and interpreters (n:m).

| Column | Type | Notes |
|---|---|---|
| `song_id` | integer | References `songs.id`, on delete cascade |
| `interpreter_id` | integer | References `interpreters.id`, on delete cascade |

The primary key is (`song_id`, `interpreter_id`).

## Limits

Defined in `LIMITS` in [src/shared/types.ts](../src/shared/types.ts).

| Item | Limit |
|---|---|
| Title | 200 characters |
| Category / interpreter name | 200 characters |
| Key, original key | 10 characters |
| First line | 100 characters |
| Chords | 2000 characters |
| Capo | 0–12 |
| Interpreters per song (input) | 200 |
| Song text | Unlimited |
| Import file size | 100 MB |
| Songs per import file | 100,000 |

Text values are trimmed (the chords field is not, to keep chord spacing); empty or whitespace-only values are stored as null.

## Uniqueness

Category names and interpreter names are unique, ignoring case. The check is done in JavaScript with Unicode-aware normalisation. The `NOCASE` index is an additional safety net for ASCII.

Songs have no uniqueness constraint. The import treats the same title and the same set of interpreters as a duplicate (see [How to export and import songs](how-to-export-import-songs.md)).

## Application settings

Stored outside the songbook, as `settings.json` in the Electron user data folder. The user data folder is named `simplelyrics`; on Windows this is `%APPDATA%\simplelyrics`. The file contains the theme, the last opened file (reopened at start) and up to 10 recent files.

## Migrations

SQL migrations live in [drizzle/](../drizzle). See [How to change the database schema](how-to-change-the-database-schema.md).
