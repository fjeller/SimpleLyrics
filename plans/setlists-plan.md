# SimpleLyrics – Plan: Setlists (SNG-001)

Branch: `SNG-001_Setlist`. Status: **implemented** (all phases). Breaks are plain markers without a label (decision after the plan was written).

## 1. Goal

A user can build one or more setlists for a gig from the songs in the open `.sng` file, save them in that file, change them later, and print them.

| Term | Meaning |
|---|---|
| Setlist | A named, ordered list of songs and breaks, for example "Pub gig 2026-11-14". |
| Set | The songs between the start, a break and the end of the setlist. Sets are numbered: Set 1, Set 2, … |
| Break | A pause in the performance. It separates two sets. |

Requirements from the request:

- Several setlists per file, stored in the database and available after a restart or after reopening the file.
- Songs are picked from the songs of the file. A song can be in several setlists, and can appear more than once in the same setlist.
- The order is set by the user while creating or editing the setlist, and is saved exactly.
- Breaks can be inserted. It is always visible where they are and which set a song belongs to.
- Printing: the setlist alone (titles only), or the setlist followed by the sheets of all its songs.

## 2. Data model

### Tables (new Drizzle migration `0001_setlists`)

**`setlists`**

| Column | Type | Notes |
|---|---|---|
| `id` | integer | Primary key, autoincrement |
| `name` | text | Not null, max 200, unique case-insensitive (same rules as categories) |
| `created_at`, `updated_at` | text | Default `CURRENT_TIMESTAMP` |

**`setlist_items`**

| Column | Type | Notes |
|---|---|---|
| `id` | integer | Primary key, autoincrement |
| `setlist_id` | integer | Not null, references `setlists.id`, on delete cascade |
| `position` | integer | Not null, 0-based order within the setlist |
| `kind` | text | `'song'` or `'break'` (check constraint) |
| `song_id` | integer | References `songs.id`, on delete cascade. Required for songs, null for breaks (check constraint) |
| `label` | text | Optional text for a break, for example "20 min" (max 100). Null for songs |

Indexes: unique (`setlist_id`, `position`), index on `song_id`. There is no uniqueness on (`setlist_id`, `song_id`), because a song may appear more than once.

A setlist has only a name. No date, venue or notes.

### Why this shape

- **Sets are not stored.** They are derived from the breaks. Moving a break or a song can never leave the stored sets inconsistent, and reordering is a single list operation. A small pure function `splitIntoSets(items)` in `src/shared/setlists.ts` turns the item list into sets for display and printing.
- **Breaks are items in the same list** as the songs, so their position is saved together with the song order.
- **Positions are rewritten on save.** The editor works on an in-memory list. Saving replaces all items of the setlist in one transaction. This is simpler and safer than moving single rows, and a setlist is small.
- **Deleting a song removes it from all setlists** (cascade). The delete confirmation for a song should say "Used in N setlists", so this does not happen by surprise.

### Normalisation on save

- Breaks at the start or end of the list, and two breaks in a row, would create empty sets. The editor shows a warning on such breaks. On save they are removed automatically.
- A setlist may be empty (useful as a draft).

### Existing files

`openDatabase` already runs all migrations when a file is opened, so existing `.sng` files get the new tables automatically on first open. An older app version opening an upgraded file keeps working, because it never touches the new tables.

## 3. Shared types and API

New in `src/shared/types.ts`:

```ts
type SetlistItemInput = { kind: 'song'; songId: number } | { kind: 'break'; label: string | null }

interface SetlistSummary { id: number; name: string; songCount: number; setCount: number; updatedAt: string }

type SetlistItem =
  | { kind: 'song'; songId: number; title: string; interpreters: string; key: string | null; capo: number }
  | { kind: 'break'; label: string | null }

interface SetlistDetail { id: number; name: string; items: SetlistItem[] }
```

New part of `SimpleLyricsApi`, mirrored in the preload and the IPC handlers, validated with zod:

| Method | Purpose |
|---|---|
| `setlists.list()` | All setlists with song and set counts, sorted by name |
| `setlists.get(id)` | One setlist with its items in order |
| `setlists.create(name)` | Empty setlist, returns the id |
| `setlists.rename(id, name)` | Rename |
| `setlists.duplicate(id, name)` | Copy, useful for a similar gig |
| `setlists.delete(id)` | Delete the setlist (songs are not touched) |
| `setlists.saveItems(id, items)` | Replace the items in one transaction, after normalisation |
| `setlists.usage(songId)` | Number of setlists using a song (for the delete warning) |

Repository: `src/main/repositories/setlists.ts`, same style as `categories.ts`. `saveItems` checks that every song id exists, inside the transaction.

## 4. User interface

### Opening the setlists

A new **Setlists** view, opened with a toolbar button and a menu entry (**Songs > Setlists...**, `Ctrl+L`). It works like the chord lookup page: it replaces the list view, and **Close** or `Esc` goes back. It needs an open file, so it is disabled on the welcome screen.

I suggest a separate view rather than a third sidebar tab. The sidebar filters the song table, while a setlist has its own order, breaks and print actions, which do not fit the song table.

### Setlists view (overview)

```
┌ Setlists ───────────────────────────────────────────── [Close] ┐
│ ┌ Setlists ────────┐ ┌ Pub gig 2026-11-14 ───────────────────┐ │
│ │ Pub gig 11-14  ◀ │ │ [Edit] [Print setlist] [Print + songs] │ │
│ │ Wedding Müller   │ │                                        │ │
│ │                  │ │ Set 1 (5 songs)                        │ │
│ │                  │ │   Whiskey in the Jar                   │ │
│ │                  │ │   The Wild Rover                       │ │
│ │                  │ │   …                                    │ │
│ │                  │ │ ── Break · 20 min ──────────────────── │ │
│ │                  │ │ Set 2 (6 songs)                        │ │
│ │ [New] [Rename]   │ │   Molly Malone                         │ │
│ │ [Duplicate] [Del]│ │   …                                    │ │
│ └──────────────────┘ └────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

- Left: the list of setlists with song counts, and the buttons New, Rename, Duplicate and Delete (with confirmation).
- Right: a read-only view of the selected setlist, grouped into sets, with the actions Edit, Print setlist and Print setlist with songs.
- Songs are not numbered. Each set has a heading ("Set 1", "Set 2", …) followed by its songs, and a break line between sets.

### Setlist editor

Opened with **Edit**, or directly after **New**. It replaces the content like the song editor, with **Cancel** and **Save** and a "discard changes?" prompt.

```
┌ Edit setlist: Pub gig 2026-11-14 ──────────── [Cancel] [Save] ┐
│ ┌ Songs ───────────────────┐   ┌ Setlist ──────────────────┐ │
│ │ [Search…              ]  │   │ Set 1                     │ │
│ │ Amazing Grace            │ → │  Whiskey in the Jar       │ │
│ │ Danny Boy             ✓  │   │  The Wild Rover      ▲ ▼ ✕│ │
│ │ Greensleeves             │   │ ── Break [20 min    ] ✕ ──│ │
│ │ …                        │   │ Set 2                     │ │
│ │                          │   │  Danny Boy                │ │
│ │ [Add →]                  │   │ [Add break] [▲] [▼] [✕]   │ │
│ └──────────────────────────┘   └───────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

- **Left pane:** all songs of the file with the existing search (3 characters, title and first line). Songs already in the setlist are marked with ✓ but can still be added again. **Add →**, double-click or `Enter` adds the song after the selected item on the right, or at the end.
- **Right pane:** the setlist with set headings, the songs without numbers, and break rows. Each set heading shows its song count. A song that appears more than once is marked with a small "2×" hint, so an accidental duplicate is easy to spot.
- **Reordering:**
  - Drag and drop of songs and breaks.
  - **▲ / ▼** buttons and `Alt+↑ / Alt+↓` move the selected item, so ordering works without a mouse.
- **Breaks:** **Add break** inserts a break after the selected item. The break row has an optional label field and can be moved and removed like a song.
- **Remove:** ✕ or the `Delete` key removes the item from the setlist, not from the file.
- The setlist name is edited in the header.

Drag and drop: I suggest native HTML5 drag and drop, with the buttons and shortcuts as the accessible alternative. This adds no dependency. If it feels clumsy, `@dnd-kit/sortable` is the fallback and would be a renderer-only dev dependency.

## 5. Printing

Both modes use the existing print path (`window.api.print.printPage()` and `@media print`). The page to print is rendered in a hidden print view, the same way the song preview is printed directly from the list today.

### Print setlist

The goal is **one sheet of paper** for the whole setlist.

- Header: always "Setlist". The setlist name is only used inside the app and never printed.
- Per set: a heading "Set 1", "Set 2", … and below it the song titles, one per line. Titles only: no numbers, no interpreters, no key or capo.
- Breaks are not printed as lines of their own. The next set heading shows where the break is. The break label is only used on screen.
- A set is never split: each set block has `break-inside: avoid`.
- Black on white, A4, the existing 18 mm margins.

Fitting the setlist on one page (automatic, measured in the browser like the existing font fitting of the song sheet):

1. Try **one column** with a large, bold font, readable from the floor on stage. The font starts at about 22 pt.
2. If the content is taller than the printable A4 height, switch to **two columns** (CSS `column-count: 2`, with a thin rule between them). Sets still never split across the columns.
3. If two columns are still too tall, reduce the font step by step down to a minimum of about 12 pt.
4. Only if even that does not fit (a very long setlist), the setlist continues on a second page, still in two columns.

The on-screen preview of the print view shows the result, so the user sees before printing whether it fits.

### Print setlist with songs

1. The setlist page as above.
2. Then every song of the setlist in setlist order, each starting on a new page (`break-before: page`), using the existing `SongSheet` component. Chord diagrams, tabs and font fitting work as in the single-song print.
3. A small header on each song page with the set, for example "Set 2", to keep the pages in order.

Breaks produce no pages of their own. A song that appears twice is printed twice.

Loading: the print view gets all songs in one call, with a new `setlists.getForPrint(id)` that returns the setlist and the full `SongDetail` of every song. This avoids many separate requests.

## 6. Export and import

Setlists are part of the JSON export and import.

**Export:** an optional `setlists` array is added to the existing format, version 1. Files without it (older exports) stay valid.

```json
"setlists": [
  {
    "name": "Pub gig",
    "items": [
      { "kind": "song", "title": "Whiskey in the Jar", "interpreters": ["Traditional"] },
      { "kind": "break", "label": "20 min" },
      { "kind": "song", "title": "Molly Malone", "interpreters": ["Traditional"] }
    ]
  }
]
```

Songs are referenced by title and interpreters, the same rule the import already uses to detect duplicates, so a setlist can be imported into another file.

**Import:**

1. The songs are imported first, as today.
2. Each setlist item is matched to a song in the target file by title (case-insensitive) and interpreter set. That song may be one just imported or one that already existed and was skipped as a duplicate.
3. Name conflicts: if a setlist with the same name (case-insensitive) already exists, the imported one is renamed with a number, "Pub gig (2)", then "Pub gig (3)" and so on, until the name is free. It is always imported.
4. An item that matches no song is left out, and the result message reports it, for example "Setlist 'Pub gig': 1 song not found".
5. Everything runs in the same transaction as the song import.

The result message gets two new lines: setlists imported, and setlists renamed.

## 7. Implementation phases

| Phase | Content | Done when |
|---|---|---|
| 1 | Schema, migration, `setlists` repository, `splitIntoSets` | Repository and set-splitting tests pass, an existing file upgrades on open |
| 2 | Types, zod schemas, IPC handlers, preload | Typecheck passes, API callable from the renderer |
| 3 | Setlists view: list, overview, New / Rename / Duplicate / Delete, toolbar button and menu entry | Setlists can be managed and viewed |
| 4 | Setlist editor: add, remove, reorder (drag and drop, buttons, keys), breaks, save and cancel | A setlist can be built and changed |
| 5 | Printing: setlist only (one page, one or two columns, auto font size), and setlist with songs | Both print modes look right on paper |
| 6 | Song delete warning ("used in N setlists"), export and import of setlists | Round trip of setlists through JSON works, name conflicts get a number |
| 7 | Documentation (how-to, reference, data model, UI, screenshots) | Docs updated |

Tests (Vitest, against temporary database files):

- Create, rename (unique, case-insensitive), duplicate and delete setlists.
- `saveItems` keeps the exact order, allows the same song more than once, and removes empty sets caused by leading, trailing or double breaks.
- Deleting a song removes it from every setlist.
- `splitIntoSets` for no breaks, several breaks and empty setlists.
- Validation rejects unknown song ids and invalid items.
- Export and import: setlists survive a round trip, a name conflict produces "Name (2)" and "Name (3)", and missing songs are left out and reported.

## 8. Decisions

| # | Question | Decision |
|---|---|---|
| 1 | Same song twice in one setlist? | Yes, allowed. The editor marks repeats with "2×". |
| 2 | Date, venue, notes on a setlist? | No. A setlist has a name only. |
| 3 | Song numbering? | No numbers. Each set has a heading ("Set 1", "Set 2", …) with its songs below. |
| 4 | Details on the printed setlist? | Titles only. All sets on one sheet if possible, with two columns when needed. |
| 5 | "Encore" set? | No. Encores are spontaneous and are not part of the setlist. |
| 6 | Durations? | Not part of this change. Songs have no length. |
| 7 | Export and import of setlists? | Yes. On a name conflict the imported setlist gets a number, "Name (2)", and is always imported. |
