# Reference: Tab notation

Source: [src/shared/tabs.ts](../src/shared/tabs.ts). Drawing: [TabDiagram.tsx](../src/renderer/src/components/TabDiagram.tsx).

Tabs are recognised in the **Song text** field only. The **Chords used** field is never searched for tabs.

## What counts as a tab line

A line is a tab line if it has these parts in order:

| Part | Rule |
|---|---|
| String name | Optional. A letter `A` to `G` or `a` to `g`, optionally followed by `#` or `b`. |
| Start | `\|`, `:` or `-`. A line without a string name must start with `\|` or `-`. |
| Body | The rest of the line: `-`, digits, `\|`, `:`, the letters `h p b r s t x v` in either case, the symbols `/ \ ~ ^ ( ) < > . * =` and spaces. |
| Dashes | The body contains at least 3 `-`. |

Any other character, such as a different letter, makes the line ordinary text.

## What counts as a tab

| Case | Result |
|---|---|
| 4 to 8 consecutive tab lines | One tab. Guitar tabs have 6 lines and bass tabs 4. |
| Fewer than 4 consecutive tab lines | Ordinary text. |
| All lines have string names and a name repeats | A new tab starts at the repeated name. |
| No string names and more than 8 lines | Split into tabs of 6 lines, or of 4 if the count is not a multiple of 6. Otherwise ordinary text. |

Text before and after a tab stays ordinary text. Blank lines next to a tab are replaced by the spacing of the drawing.

Lines of different length are padded with `-` to the longest line.

## How a tab is drawn

Every character position is one column, so notes played at the same time stay aligned.

| Element in the text | Drawing |
|---|---|
| String names | Labels left of the lines, as written. |
| `-` | The string line. |
| `\|` | A bar line across all strings, when at least half of the lines (but at least 2) have it in the same column. |
| Digits | A fret number on the string. Several digits in a row, such as `13`, are one number. |
| `/` | A slide up between two notes. |
| `\` | A slide down between two notes. |
| `x`, `X` | A multiplication sign for a muted note. |
| `h p b r s t v ~ ^ ( ) < > . * =` | The symbol in small italic type at that position. |
| `:` and spaces | Not drawn. |

## Rows

A row is at most 56 columns wide (`TAB_MAX_COLS`). A longer tab is split as follows:

1. The row ends at the last bar line that fits.
2. The next row starts at that same bar line, so every row starts and ends with a bar line, and repeats the string names.
3. If there is no bar line in range, the row is cut at a column where all strings have a dash.

All rows of a tab are drawn at the same scale, so the last, shorter row is narrower than the others.

## Display and print

- The tab uses the text colour of the sheet, and prints in black on white.
- Tab lines are not counted when the font size of the lyrics is fitted to the page width.
- A row is not split across two pages.

See [How to add a guitar tab to a song](how-to-add-guitar-tabs.md) for the steps.
