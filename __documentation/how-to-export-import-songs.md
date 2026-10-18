# How to export and import songs

Use the JSON export to share songs, back them up in a readable format, or move them between `.sng` files.

## Export songs

1. Open the songbook file.
2. Choose **Export songs** (toolbar, right side) or **File > Export Songs as JSON...**.
3. Pick a target. The suggested name is the songbook name with the extension `.json`.

All songs of the open file are exported, together with all categories and interpreters (including empty ones). A message box shows the number of exported songs.

## Import songs

1. Open the songbook file that should receive the songs.
2. Choose **Import songs** (toolbar, right side) or **File > Import Songs from JSON...**.
3. Pick a JSON file created by SimpleLyrics.

A message box shows the result:

- **Imported**: songs that were added.
- **Skipped (already present)**: songs that already exist.
- **New categories** / **New interpreters**: entries that were created (only shown if greater than 0).
- **Invalid (not imported)**: songs that failed validation, with the reason. The first 10 are listed.

## How duplicates are detected

A song is skipped when a song with the same **title** (case-insensitive) and the same **set of interpreters** already exists. Differences in chords, lyrics, key or capo are not compared. Duplicates inside the imported file are also skipped.

If you want to replace an existing song with a changed version, delete or rename the old one first, or edit it manually.

## What happens on errors

- The import is all-or-nothing for the database: all valid songs are added in one transaction.
- Invalid songs, for example a capo above 12, are skipped and reported. Valid songs in the same file are still imported.
- A file that is not JSON, is not a SimpleLyrics export, or has an unsupported version is rejected with an error message and nothing is changed.
- Files larger than 100 MB are rejected.

## See also

- [Export file format](reference-export-format.md)
