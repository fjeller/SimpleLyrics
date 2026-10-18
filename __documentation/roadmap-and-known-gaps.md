# Explanation: Roadmap and known gaps

This document lists what is not yet verified or implemented, and ideas for further development. None of the ideas is committed.

## Not yet verified manually

The automated tests cover the data layer, not these areas:

- New / Open / Save As dialogs.
- Delete confirmations for categories and interpreters.
- Export and import dialogs.
- Real print output, also on Letter paper, where the margins differ from A4.
- Light theme in all views.
- Keyboard shortcuts: `Ctrl+N`, `Ctrl+F`, `Ctrl+P`, `Ctrl+Shift+P`.

## Known gaps

- Packaging for macOS (dmg) and Linux (AppImage, deb) is configured but untested. Only the unpacked Windows build was verified.
- There is no app icon yet; the default Electron icon is used.
- There is no code signing and no auto-update.
- The import conflict handling is "skip" only.

## Ideas

| Idea | Notes |
|---|---|
| Import conflict modes | Alternatives to "skip": update the existing song, keep both when the content differs, or ask per song. |
| Sort by column | Sort the song list by title, interpreter, category or capo. |
| Chord transposition | Transpose chords and the key by a number of semitones. Needs a parser for chord notation. |
| Print several songs | Print the selection or a whole category in one job. |
| Key on the print sheet | Show the key (and original key) on the sheet next to the capo. |

## Related

- [Design decisions and gotchas](explanation-design-decisions.md)
- [Data model and limits](reference-data-model-and-limits.md)
