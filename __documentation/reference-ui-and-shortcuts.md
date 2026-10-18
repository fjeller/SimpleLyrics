# Reference: User interface and keyboard shortcuts

## Views

| View | Description |
|---|---|
| Welcome screen | Shown when no file is open (first start, or the last file is missing). Offers New file, Open file and the recent files. |
| List | Sidebar and song list. |
| Editor | Replaces the whole window content while a song is created or edited. |
| Preview | Print-style sheet of the selected song. |

## Toolbar

| Position | Button | Notes |
|---|---|---|
| Left | New file, Open file, Save file as | Save as copies the open file (SQLite `backup`). |
| Left | New song, Edit song, Delete song | Edit and Delete need a selected song. |
| Left | Preview song, Print song | Need a selected song. |
| Right | Export songs, Import songs | JSON, see [Export file format](reference-export-format.md). |
| Right | Dark / light switch | Theme is saved in the settings. |

While the editor is open, all buttons are disabled, except Delete (for an existing song) and the theme switch.

## Menu

| Menu | Commands |
|---|---|
| File | New File..., Open File..., Open Recent, Save File As..., Export Songs as JSON..., Import Songs from JSON..., Quit (Close on macOS) |
| Edit | Standard edit commands |
| Songs | New Song, Preview Song, Print Song..., Search |
| View | Dark Theme, Light Theme, Toggle Full Screen. In development builds also Reload and Toggle Developer Tools. |

Items that work on songs and the file commands Save As, Export and Import are disabled while no file is open.

## Keyboard shortcuts

`Ctrl` is `Cmd` on macOS.

| Shortcut | Action |
|---|---|
| `Ctrl+Shift+N` | New file |
| `Ctrl+O` | Open file |
| `Ctrl+Shift+S` | Save file as |
| `Ctrl+N` | New song |
| `Ctrl+Shift+P` | Preview song |
| `Ctrl+P` | Print song |
| `Ctrl+F` | Focus the search field |
| `Enter` (song list) | Edit the selected song |
| `Delete` (song list) | Delete the selected song, after confirmation |
| `Esc` (editor) | Cancel, with a prompt if there are unsaved changes |

Double-clicking a song also opens the editor.

## Sidebar

- Tabs **Categories** and **Interpreters**. Only one is active at a time.
- Each tab starts with **All songs** and a virtual entry (**(No category)** or **(No interpreter)**).
- Every entry shows its song count.
- Buttons below the list: Add, Rename selected and Delete selected (with confirmation). Rename and Delete are disabled for "All songs" and the virtual entry.

## Song list

Rows have two lines: title, interpreters, category and capo; below that, the first line in smaller text. The list is sorted by title with Unicode-aware ordering.

## Search

- Starts at 3 characters (`MIN_SEARCH_LENGTH`). Shorter input falls back to the sidebar selection.
- Runs on every keystroke.
- Matches "contains" in the title and the first line.
- Is global: it ignores the sidebar selection.
- Is Unicode-aware (case-insensitive also for non-ASCII letters).

## Song editor

| Field | Type | Limit |
|---|---|---|
| Title | Text | Required, 200 characters |
| Key / Original key | Text | 10 characters |
| First line | Text | 100 characters |
| Capo | Number | 0–12, default 0 |
| Category | Single select, creatable | One category or none |
| Interpreters | Multi select, creatable | Any number |
| Chords | Textarea, not resizable | 2000 characters |
| Song text | Textarea | Unlimited |

Buttons: **Cancel** and **Save**.

## Preview and print sheet

- Title (26 px).
- Interpreters on the left, "Capo: N" on the right (only if the capo is greater than 0), 14 px.
- A rule.
- Chords (bold, monospace).
- Song text (monospace).

The font size for chords and text is chosen so that the longest line fits the page width, between 1 rem and 1.5 rem. On screen the sheet follows the theme. Printing uses the system dialog, is always black on white, and uses 18 mm margins. The width calculation assumes A4.

## Theme

Dark (default) or light. The choice is saved in `settings.json` in the user data folder.
