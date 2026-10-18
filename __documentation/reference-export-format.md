# Reference: Export file format

The export is a UTF-8 JSON file, written with 2-space indentation. Songs reference their category and interpreters by name, so an export can be imported into any songbook.

Types: `SongExport` and `ExportedSong` in [src/shared/types.ts](../src/shared/types.ts). Validation: [src/main/ipc/validation.ts](../src/main/ipc/validation.ts).

## Top-level object

| Field | Type | Required | Description |
|---|---|---|---|
| `format` | string | Yes | Must be `"simplelyrics-songs"`. |
| `version` | number | Yes | Must be `1`. |
| `exportedAt` | string | No | ISO 8601 timestamp. Written on export, ignored on import. |
| `categories` | string[] | No | All category names, including empty categories. Default `[]`. |
| `interpreters` | string[] | No | All interpreter names, including unused ones. Default `[]`. |
| `songs` | object[] | Yes | List of songs. |

## Song object

| Field | Type | Required | Description |
|---|---|---|---|
| `title` | string | Yes | 1–200 characters after trimming. |
| `key` | string or null | No | Max 10 characters. |
| `originalKey` | string or null | No | Max 10 characters. |
| `firstLine` | string or null | No | Max 100 characters. |
| `capo` | integer | No | 0–12. Default 0. |
| `songText` | string or null | No | Lyrics. |
| `chords` | string or null | No | Max 2000 characters. |
| `category` | string or null | No | Category name, created if missing. |
| `interpreters` | string[] | No | Interpreter names, created if missing. Default `[]`. |

Missing optional fields are treated as `null` (or `0` / `[]`).

## Example

```json
{
  "format": "simplelyrics-songs",
  "version": 1,
  "exportedAt": "2026-10-18T10:00:00.000Z",
  "categories": ["Folk"],
  "interpreters": ["Traditional"],
  "songs": [
    {
      "title": "Example Song",
      "key": "G",
      "originalKey": null,
      "firstLine": "First line of the song",
      "capo": 2,
      "songText": "Verse 1...\nVerse 2...",
      "chords": "G  C  D  G",
      "category": "Folk",
      "interpreters": ["Traditional"]
    }
  ]
}
```

## Import behaviour

| Situation | Result |
|---|---|
| Not JSON, wrong `format` or `version`, no `songs` list | Whole file rejected with an error. |
| A song fails validation | That song is skipped and reported, others are imported. |
| Same title (case-insensitive) and same interpreter set as an existing song | Song skipped. |
| Unknown category or interpreter | Created. |

Details and user steps: [How to export and import songs](how-to-export-import-songs.md).
