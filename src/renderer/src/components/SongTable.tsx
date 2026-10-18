import { useEffect, useRef } from 'react'
import type { KeyboardEvent } from 'react'
import type { SongListItem } from '../../../shared/types'

interface SongTableProps {
  songs: SongListItem[]
  selectedId: number | null
  emptyText: string
  onSelect: (id: number) => void
  onOpen: (id: number) => void
  onDelete: (song: SongListItem) => void
}

export function SongTable({ songs, selectedId, emptyText, onSelect, onOpen, onDelete }: SongTableProps): React.JSX.Element {
  const bodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (selectedId === null) return
    bodyRef.current?.querySelector(`[data-song-id="${selectedId}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [selectedId])

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (songs.length === 0) return
    const index = songs.findIndex((s) => s.id === selectedId)
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        onSelect(songs[Math.min(index + 1, songs.length - 1)].id)
        break
      case 'ArrowUp':
        event.preventDefault()
        onSelect(songs[Math.max(index - 1, 0)].id)
        break
      case 'Home':
        event.preventDefault()
        onSelect(songs[0].id)
        break
      case 'End':
        event.preventDefault()
        onSelect(songs[songs.length - 1].id)
        break
      case 'Enter':
        if (index >= 0) onOpen(songs[index].id)
        break
      case 'Delete':
        if (index >= 0) onDelete(songs[index])
        break
    }
  }

  return (
    <div className="song-table" role="grid" aria-label="Songs" aria-rowcount={songs.length}>
      <div className="song-header" role="row">
        <span role="columnheader">Title</span>
        <span role="columnheader">Interpreter(s)</span>
        <span role="columnheader">Category</span>
        <span role="columnheader" className="capo-col">
          Capo
        </span>
      </div>
      <div className="song-body" ref={bodyRef} tabIndex={0} onKeyDown={handleKeyDown}>
        {songs.length === 0 && <p className="empty">{emptyText}</p>}
        {songs.map((song) => (
          <div
            key={song.id}
            role="row"
            data-song-id={song.id}
            className="song-row"
            aria-selected={song.id === selectedId}
            onClick={() => onSelect(song.id)}
            onDoubleClick={() => onOpen(song.id)}
          >
            <span role="gridcell" className="title" title={song.title}>
              {song.title}
            </span>
            <span role="gridcell" title={song.interpreters}>
              {song.interpreters}
            </span>
            <span role="gridcell" title={song.category ?? ''}>
              {song.category ?? ''}
            </span>
            <span role="gridcell" className="capo-col">
              {song.capo > 0 ? song.capo : ''}
            </span>
            {song.firstLine && (
              <span role="gridcell" className="first-line" title={song.firstLine}>
                {song.firstLine}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
