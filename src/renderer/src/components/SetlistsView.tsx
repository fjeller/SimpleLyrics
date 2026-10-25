import { useCallback, useEffect, useRef, useState } from 'react'
import type { SetlistDetail, SetlistSummary } from '../../../shared/types'
import { splitIntoSets } from '../../../shared/setlists'
import { errorMessage, unwrap } from '../api'
import { ConfirmDialog } from './Dialogs'
import { NameEditDialog } from './NameEditDialog'

type DialogState = { kind: 'new' } | { kind: 'rename' } | { kind: 'duplicate' } | { kind: 'delete' } | null

interface SetlistsViewProps {
  initialSelectedId: number | null
  onClose: () => void
  onEdit: (id: number) => void
  onPrint: (id: number, withSongs: boolean) => void
}

export function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`
}

export function SetlistsView({ initialSelectedId, onClose, onEdit, onPrint }: SetlistsViewProps): React.JSX.Element {
  const [lists, setLists] = useState<SetlistSummary[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(initialSelectedId)
  const [detail, setDetail] = useState<SetlistDetail | null>(null)
  const [dialog, setDialog] = useState<DialogState>(null)
  const [error, setError] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  const reload = useCallback(async (select?: number | null) => {
    try {
      const loaded = await unwrap(window.api.setlists.list())
      setLists(loaded)
      setSelectedId((current) => {
        const wanted = select !== undefined ? select : current
        return loaded.some((l) => l.id === wanted) ? wanted : (loaded[0]?.id ?? null)
      })
    } catch (e) {
      setError(errorMessage(e))
    }
  }, [])

  useEffect(() => {
    void reload()
    rootRef.current?.focus()
  }, [reload])

  useEffect(() => {
    if (selectedId === null) {
      setDetail(null)
      return
    }
    let cancelled = false
    unwrap(window.api.setlists.get(selectedId))
      .then((loaded) => {
        if (!cancelled) setDetail(loaded)
      })
      .catch((e) => {
        if (!cancelled) setError(errorMessage(e))
      })
    return () => {
      cancelled = true
    }
  }, [selectedId, lists])

  const selected = lists.find((l) => l.id === selectedId)
  const sets = detail ? splitIntoSets(detail.items) : []

  async function submitName(name: string): Promise<void> {
    if (dialog?.kind === 'new') {
      const id = await unwrap(window.api.setlists.create(name))
      setDialog(null)
      onEdit(id)
      return
    }
    if (!selected) return
    if (dialog?.kind === 'rename') {
      await unwrap(window.api.setlists.rename(selected.id, name))
      setDialog(null)
      await reload(selected.id)
    } else if (dialog?.kind === 'duplicate') {
      const id = await unwrap(window.api.setlists.duplicate(selected.id, name))
      setDialog(null)
      await reload(id)
    }
  }

  async function confirmDelete(): Promise<void> {
    if (!selected) return
    setDialog(null)
    try {
      await unwrap(window.api.setlists.delete(selected.id))
      await reload(null)
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <div className="preview" ref={rootRef} tabIndex={-1} onKeyDown={(e) => e.key === 'Escape' && !dialog && onClose()}>
      <header className="preview-header">
        <h2>Setlists</h2>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </header>
      {error && (
        <p className="banner error" role="alert">
          {error}
        </p>
      )}
      <div className="setlists">
        <aside className="setlists-sidebar" aria-label="Setlists">
          <ul className="entry-list">
            {lists.length === 0 && <li className="setlists-empty">No setlists yet.</li>}
            {lists.map((list) => (
              <li key={list.id}>
                <button
                  type="button"
                  className="entry"
                  aria-current={list.id === selectedId ? 'true' : undefined}
                  onClick={() => setSelectedId(list.id)}
                  onDoubleClick={() => onEdit(list.id)}
                >
                  <span className="entry-label">{list.name}</span>
                  <span className="entry-count">{list.songCount}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="sidebar-actions">
            <button type="button" onClick={() => setDialog({ kind: 'new' })} title="New setlist">
              New
            </button>
            <button type="button" disabled={!selected} onClick={() => setDialog({ kind: 'rename' })} title="Rename selected setlist">
              Rename
            </button>
            <button type="button" disabled={!selected} onClick={() => setDialog({ kind: 'duplicate' })} title="Duplicate selected setlist">
              Duplicate
            </button>
            <button type="button" className="danger-outline" disabled={!selected} onClick={() => setDialog({ kind: 'delete' })} title="Delete selected setlist">
              Delete
            </button>
          </div>
        </aside>

        <main className="setlist-overview">
          {!selected ? (
            <p className="empty">Create a setlist with "New".</p>
          ) : (
            <>
              <div className="setlist-overview-header">
                <h3>{selected.name}</h3>
                <span className="setlist-overview-meta">
                  {plural(selected.songCount, 'song')} in {plural(selected.setCount, 'set')}
                </span>
                <div className="editor-header-actions">
                  <button type="button" className="primary" onClick={() => onEdit(selected.id)}>
                    Edit
                  </button>
                  <button type="button" disabled={selected.songCount === 0} onClick={() => onPrint(selected.id, false)}>
                    Print setlist...
                  </button>
                  <button type="button" disabled={selected.songCount === 0} onClick={() => onPrint(selected.id, true)}>
                    Print with songs...
                  </button>
                </div>
              </div>
              {sets.length === 0 ? (
                <p className="empty">This setlist has no songs yet. Use "Edit" to add some.</p>
              ) : (
                <div className="setlist-sets">
                  {sets.map((set, index) => (
                    <section key={index} className="setlist-set">
                      <h4>
                        Set {index + 1} <small>{plural(set.length, 'song')}</small>
                      </h4>
                      <ul>
                        {set.map((song, songIndex) => (
                          <li key={songIndex}>
                            <span className="setlist-song-title">{song.title}</span>
                            {song.interpreters && <span className="setlist-song-meta">{song.interpreters}</span>}
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {dialog && dialog.kind !== 'delete' && (
        <NameEditDialog
          title={dialog.kind === 'new' ? 'New setlist' : dialog.kind === 'rename' ? 'Rename setlist' : 'Duplicate setlist'}
          initialName={dialog.kind === 'rename' ? (selected?.name ?? '') : dialog.kind === 'duplicate' ? `${selected?.name ?? ''} (copy)` : ''}
          submitLabel={dialog.kind === 'new' ? 'Create' : dialog.kind === 'rename' ? 'Rename' : 'Duplicate'}
          onSubmit={submitName}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog?.kind === 'delete' && selected && (
        <ConfirmDialog
          title="Delete setlist?"
          message={`"${selected.name}" will be deleted. The songs themselves are kept.`}
          confirmLabel="Delete"
          danger
          onConfirm={() => void confirmDelete()}
          onCancel={() => setDialog(null)}
        />
      )}
    </div>
  )
}
