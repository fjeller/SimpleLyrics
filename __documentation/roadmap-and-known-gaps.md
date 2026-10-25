# Explanation: Roadmap and known gaps

This document lists what is not yet verified or implemented, and ideas for further development. None of the ideas is committed.

## Not yet verified manually

The automated tests cover the data layer, not these areas:

- New / Open / Save As dialogs.
- Delete confirmations for categories and interpreters.
- Export and import dialogs.
- Real print output, also on Letter paper, where the margins differ from A4.
- Light theme in all views.
- Keyboard shortcuts: `Ctrl+N`, `Ctrl+F`, `Ctrl+P`, `Ctrl+Shift+P`, `Ctrl+L`.
- Setlists: dragging with the mouse in the setlist editor, and the printed setlist on paper (one-page fitting, page breaks before the songs).

## Known gaps

- Packaging for macOS (dmg) and Linux (AppImage, deb) is configured but untested. Only the unpacked Windows build was verified.
- There is no app icon yet; the default Electron icon is used.
- There is no code signing and no auto-update.
- The import conflict handling is "skip" only.
- Chord diagrams cover only standard chords (see [Chord notation and diagrams](reference-chord-notation-and-diagrams.md)). Extended chords such as `9`, `m7b5` or `m6`, and most slash chords, show "No diagram".
- The chord lookup lists the open shape and the E and A barre shapes only. There are no C, D or G shapes and no alternative voicings.
- The chord lookup and circle of fifths pages have no keyboard shortcut.
- Tabs are only drawn in the preview and print-out. The song editor shows them as plain text, and there is no tab editor.
- Tab techniques other than slides are shown as small letters. Bends, vibrato, hammer-ons and pull-offs are not drawn as arcs or arrows, and repeat signs are not drawn.

## Ideas

| Idea | Notes |
|---|---|
| Import conflict modes | Alternatives to "skip": update the existing song, keep both when the content differs, or ask per song. |
| More sort options | Sort by capo or first line, sort by several columns, or remember the sort across restarts. |
| Chord transposition | Transpose chords and the key by a number of semitones. Needs a parser for chord notation. |
| Print several songs | Print the selection or a whole category in one job. Setlists already print all their songs. |
| Key on the print sheet | Show the key (and original key) on the sheet next to the capo. |
| More chord types | Add ninths, minor sixths, `m7b5` and more slash chords to the chord tables. |
| More voicings | Add the C, D and G shapes and alternative fingerings of the same chord. |
| Pick a diagram | Let the user choose which voicing is shown in a song's preview. |
| Capo in the diagrams | Show the capo on the diagrams, or the sounding chord names. |
| Circle of fifths for a song | Detect the key of a song from its chords and highlight the song's chords on the circle. |
| Circle and chord diagrams | Click a chord on the circle of fifths to open its diagram. |
| Richer tabs | Draw hammer-ons and pull-offs as arcs, bends as arrows, and repeat signs; show a live tab preview in the editor. |

## Related

- [Design decisions and gotchas](explanation-design-decisions.md)
- [Data model and limits](reference-data-model-and-limits.md)
