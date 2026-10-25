import { useEffect, useMemo, useRef, useState } from 'react'
import type { DragEvent, FormEvent, KeyboardEvent } from 'react'
import { LIMITS, MIN_SEARCH_LENGTH } from '../../../shared/types'
import type { SetlistItemInput, SongFilter, SongListItem } from '../../../shared/types'
import { errorMessage, unwrap } from '../api'
import { ConfirmDialog } from './Dialogs'

type EditorItem = { key: number; kind: 'song'; songId: number; title: string; interpreters: string } | { key: number; kind: 'break' }

type DragSource = { from: 'setlist'; index: number } | { from: 'songs'; songId: number }

type ItemData = EditorItem extends infer T ? (T extends EditorItem ? Omit<T, 'key'> : never) : never

interface SetlistEditorProps {
  setlistId: number
  onClose: () => void
  onSaved: () => void
}

let nextKey = 1
const withKey = (item: ItemData): EditorItem => ({ ...item, key: nextKey++ }) as EditorItem

const snapshot = (name: string, items: EditorItem[]): string =>
  JSON.stringify([name.trim(), items.map((i) => (i.kind === 'song' ? i.songId : 0))])

function toInput(items: EditorItem[]): SetlistItemInput[] {
  return items.map((item) => (item.kind === 'song' ? { kind: 'song', songId: item.songId } : { kind: 'break' }))
}

export function SetlistEditor({ setlistId, onClose, onSaved }: SetlistEditorProps): React.JSX.Element {
  const [name, setName] = useState('')
  const [items, setItems] = useState<EditorItem[]>([])
  const [initial, setInitial] = useState<string | null>(null)
  const [songs, setSongs] = useState<SongListItem[]>([])
  const [search, setSearch] = useState('')
  const [songSelection, setSongSelection] = useState<number | null>(null)
  const [itemSelection, setItemSelection] = useState<number | null>(null)
  const [drag, setDrag] = useState<DragSource | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const setlistRef = useRef<HTMLOListElement>(null)
  const songsRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    let cancelled = false
    unwrap(window.api.setlists.get(setlistId))
      .then((loaded) => {
        if (cancelled) return
        if (!loaded) {
          setError('The setlist no longer exists.')
          return
        }
        const loadedItems = loaded.items.map(withKey)
        setName(loaded.name)
        setItems(loadedItems)
        setInitial(snapshot(loaded.name, loadedItems))
      })
      .catch((e) => {
        if (!cancelled) setError(errorMessage(e))
      })
    return () => {
      cancelled = true
    }
  }, [setlistId])

  const term = search.trim()
  const filterKey = term.length >= MIN_SEARCH_LENGTH ? term : ''
  useEffect(() => {
    let cancelled = false
    const filter: SongFilter = filterKey ? { kind: 'search', term: filterKey } : { kind: 'all' }
    unwrap(window.api.songs.list(filter))
      .then((list) => {
        if (!cancelled) setSongs(list)
      })
      .catch((e) => {
        if (!cancelled) setError(errorMessage(e))
      })
    return () => {
      cancelled = true
    }
  }, [filterKey])

  const usage = useMemo(() => {
    const counts = new Map<number, number>()
    for (const item of items) if (item.kind === 'song') counts.set(item.songId, (counts.get(item.songId) ?? 0) + 1)
    return counts
  }, [items])

  const loaded = initial !== null
  const dirty = loaded && snapshot(name, items) !== initial

  function insertAt(index: number, item: EditorItem): void {
    setItems((current) => [...current.slice(0, index), item, ...current.slice(index)])
    setItemSelection(index)
  }

  const insertionIndex = (): number => (itemSelection === null ? items.length : itemSelection + 1)

  function addSong(songId: number | null, index = insertionIndex()): void {
    const song = songs.find((s) => s.id === songId)
    if (!song) return
    insertAt(index, withKey({ kind: 'song', songId: song.id, title: song.title, interpreters: song.interpreters }))
  }

  function addBreak(): void {
    insertAt(insertionIndex(), withKey({ kind: 'break' }))
    setlistRef.current?.focus()
  }

  function move(from: number, to: number): void {
    if (from === to || to < 0 || to >= items.length) return
    setItems((current) => {
      const next = [...current]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return next
    })
    setItemSelection(to)
  }

  function remove(index: number): void {
    setItems((current) => current.filter((_, i) => i !== index))
    setItemSelection(items.length <= 1 ? null : Math.min(index, items.length - 2))
  }

  function handleSetlistKey(event: KeyboardEvent<HTMLOListElement>): void {
    if (items.length === 0) return
    const index = itemSelection ?? -1
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const delta = event.key === 'ArrowDown' ? 1 : -1
      if (event.altKey && index >= 0) move(index, index + delta)
      else setItemSelection(Math.min(Math.max(index + delta, 0), items.length - 1))
    } else if (event.key === 'Delete' && index >= 0) {
      event.preventDefault()
      remove(index)
    }
  }

  function handleSongsKey(event: KeyboardEvent<HTMLUListElement>): void {
    if (songs.length === 0) return
    const index = songs.findIndex((s) => s.id === songSelection)
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const next = event.key === 'ArrowDown' ? Math.min(index + 1, songs.length - 1) : Math.max(index - 1, 0)
      setSongSelection(songs[next].id)
      songsRef.current?.querySelector(`[data-song-id="${songs[next].id}"]`)?.scrollIntoView({ block: 'nearest' })
    } else if (event.key === 'Enter' && index >= 0) {
      event.preventDefault()
      addSong(songSelection)
    }
  }

  function dragOverItem(event: DragEvent<HTMLLIElement>, index: number): void {
    if (!drag) return
    event.preventDefault()
    event.stopPropagation()
    const box = event.currentTarget.getBoundingClientRect()
    setDropIndex(event.clientY < box.top + box.height / 2 ? index : index + 1)
  }

  function drop(event: DragEvent): void {
    event.preventDefault()
    const target = dropIndex ?? items.length
    if (drag?.from === 'setlist') move(drag.index, drag.index < target ? target - 1 : target)
    else if (drag?.from === 'songs') addSong(drag.songId, target)
    setDrag(null)
    setDropIndex(null)
  }

  function endDrag(): void {
    setDrag(null)
    setDropIndex(null)
  }

  async function save(event?: FormEvent): Promise<void> {
    event?.preventDefault()
    if (!name.trim()) {
      setError('The setlist name must not be empty.')
      return
    }
    setSaving(true)
    try {
      await unwrap(window.api.setlists.save(setlistId, name, toInput(items)))
      onSaved()
    } catch (e) {
      setError(errorMessage(e))
      setSaving(false)
    }
  }

  function requestClose(): void {
    if (dirty) setConfirmDiscard(true)
    else onClose()
  }

  // Set headings are derived on the fly; a break starts the next set.
  const rows: React.ReactNode[] = []
  let setNumber = 1
  let songsInSet = 0
  const setHeading = (n: number, key: string): React.ReactNode => (
    <li key={key} className="setlist-edit-heading" aria-hidden="true">
      Set {n}
    </li>
  )
  const emptyHint = (key: string): React.ReactNode => (
    <li key={key} className="setlist-edit-hint" aria-hidden="true">
      Empty set (removed when saving)
    </li>
  )
  rows.push(setHeading(1, 'set-1'))
  items.forEach((item, index) => {
    const classes = [
      'setlist-edit-row',
      item.kind === 'break' ? 'is-break' : '',
      index === itemSelection ? 'selected' : '',
      dropIndex === index ? 'drop-before' : '',
      dropIndex === items.length && index === items.length - 1 ? 'drop-after' : ''
    ]
      .filter(Boolean)
      .join(' ')
    if (item.kind === 'break' && songsInSet === 0) rows.push(emptyHint(`hint-${item.key}`))
    rows.push(
      <li
        key={item.key}
        className={classes}
        role="option"
        aria-selected={index === itemSelection}
        draggable
        onClick={() => setItemSelection(index)}
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = 'move'
          e.dataTransfer.setData('text/plain', String(item.key))
          setDrag({ from: 'setlist', index })
        }}
        onDragOver={(e) => dragOverItem(e, index)}
        onDragEnd={endDrag}
      >
        <span className="drag-handle" aria-hidden="true">
          ⋮⋮
        </span>
        {item.kind === 'song' ? (
          <>
            <span className="setlist-song-title">{item.title}</span>
            {item.interpreters && <span className="setlist-song-meta">{item.interpreters}</span>}
            {(usage.get(item.songId) ?? 0) > 1 && (
              <span className="setlist-repeat" title="This song appears more than once in the setlist">
                {usage.get(item.songId)}×
              </span>
            )}
          </>
        ) : (
          <span className="setlist-break-label">Break</span>
        )}
        <span className="setlist-row-actions">
          <button type="button" className="link" title="Move up (Alt+↑)" aria-label="Move up" disabled={index === 0} onClick={(e) => { e.stopPropagation(); move(index, index - 1) }}>
            ▲
          </button>
          <button type="button" className="link" title="Move down (Alt+↓)" aria-label="Move down" disabled={index === items.length - 1} onClick={(e) => { e.stopPropagation(); move(index, index + 1) }}>
            ▼
          </button>
          <button type="button" className="link danger-text" title="Remove from setlist (Delete)" aria-label="Remove from setlist" onClick={(e) => { e.stopPropagation(); remove(index) }}>
            ✕
          </button>
        </span>
      </li>
    )
    if (item.kind === 'break') {
      setNumber++
      songsInSet = 0
      rows.push(setHeading(setNumber, `set-${item.key}`))
    } else {
      songsInSet++
    }
  })
  if (items.length > 0 && songsInSet === 0) rows.push(emptyHint('hint-end'))

  return (
    <form
      className="editor"
      onSubmit={(e) => void save(e)}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && !e.defaultPrevented && !confirmDiscard) requestClose()
      }}
    >
      <header className="editor-header">
        <label className="setlist-name-field">
          <span>Setlist</span>
          <input type="text" value={name} maxLength={LIMITS.name} disabled={!loaded} aria-label="Setlist name" onChange={(e) => setName(e.target.value)} />
        </label>
        <div className="editor-header-actions">
          <button type="button" onClick={requestClose}>
            Cancel
          </button>
          <button type="submit" className="primary" disabled={saving || !loaded}>
            Save
          </button>
        </div>
      </header>

      {error && (
        <p className="banner error" role="alert">
          {error}
        </p>
      )}

      <div className="setlist-editor">
        <section className="setlist-pane">
          <h3>Songs</h3>
          <input
            type="search"
            value={search}
            placeholder={`Search title or first line (from ${MIN_SEARCH_LENGTH} characters)`}
            aria-label="Search songs"
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.preventDefault()
            }}
          />
          <ul className="setlist-song-list" ref={songsRef} role="listbox" aria-label="Songs" tabIndex={0} onKeyDown={handleSongsKey}>
            {songs.length === 0 && <li className="setlist-edit-hint">No songs found.</li>}
            {songs.map((song) => (
              <li
                key={song.id}
                data-song-id={song.id}
                role="option"
                aria-selected={song.id === songSelection}
                className={`setlist-edit-row${song.id === songSelection ? ' selected' : ''}`}
                draggable
                onClick={() => setSongSelection(song.id)}
                onDoubleClick={() => addSong(song.id)}
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = 'copy'
                  e.dataTransfer.setData('text/plain', song.title)
                  setDrag({ from: 'songs', songId: song.id })
                }}
                onDragEnd={endDrag}
              >
                <span className="setlist-song-title">{song.title}</span>
                {song.interpreters && <span className="setlist-song-meta">{song.interpreters}</span>}
                {usage.has(song.id) && (
                  <span className="setlist-in-list" title="Already in this setlist">
                    ✓
                  </span>
                )}
              </li>
            ))}
          </ul>
          <div className="sidebar-actions">
            <button type="button" disabled={songSelection === null} onClick={() => addSong(songSelection)} title="Add the selected song after the selected setlist entry (Enter)">
              Add →
            </button>
          </div>
        </section>

        <section className="setlist-pane">
          <h3>
            Setlist <small>{items.filter((i) => i.kind === 'song').length} songs</small>
          </h3>
          <ol
            className={`setlist-items${drag ? ' dragging' : ''}`}
            ref={setlistRef}
            role="listbox"
            aria-label="Setlist"
            tabIndex={0}
            onKeyDown={handleSetlistKey}
            onDragOver={(e) => {
              if (!drag) return
              e.preventDefault()
              if (e.target === e.currentTarget) setDropIndex(items.length)
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDropIndex(null)
            }}
            onDrop={drop}
          >
            {rows}
            {items.length === 0 && <li className="setlist-edit-hint">Add songs from the list on the left, or drag them here.</li>}
          </ol>
          <div className="sidebar-actions">
            <button type="button" onClick={addBreak} title="Insert a break after the selected entry; it starts a new set">
              Add break
            </button>
            <button type="button" disabled={itemSelection === null || itemSelection === 0} onClick={() => itemSelection !== null && move(itemSelection, itemSelection - 1)}>
              Move up
            </button>
            <button type="button" disabled={itemSelection === null || itemSelection === items.length - 1} onClick={() => itemSelection !== null && move(itemSelection, itemSelection + 1)}>
              Move down
            </button>
            <button type="button" className="danger-outline" disabled={itemSelection === null} onClick={() => itemSelection !== null && remove(itemSelection)}>
              Remove
            </button>
          </div>
        </section>
      </div>

      {confirmDiscard && (
        <ConfirmDialog
          title="Discard changes?"
          message="Your changes to this setlist have not been saved."
          confirmLabel="Discard"
          danger
          onConfirm={onClose}
          onCancel={() => setConfirmDiscard(false)}
        />
      )}
    </form>
  )
}
