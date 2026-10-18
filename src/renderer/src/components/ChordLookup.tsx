import { useEffect, useRef, useState } from 'react'
import { chordFamilies, findChordShapes, NATURAL_ROOT_NAMES, ROOT_NAMES } from '../../../shared/chords'
import type { ChordFamilies } from '../../../shared/chords'
import { ChordDiagram } from './ChordDiagram'

const ALL = ''

function Group({ title, chords }: { title: string; chords: ChordFamilies['major'] }): React.JSX.Element | null {
  if (chords.length === 0) return null
  return (
    <section className="chord-lookup-group">
      <h3>{title}</h3>
      <div className="chord-grid">
        {chords.flatMap((chord) =>
          findChordShapes(chord).map((shape) => (
            <ChordDiagram
              key={`${chord.key}:${shape.frets.join()}`}
              chord={chord}
              shape={shape}
              note={shape.position === 0 ? 'Open' : `Fret ${shape.position}`}
            />
          ))
        )}
      </div>
    </section>
  )
}

export function ChordLookup({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [root, setRoot] = useState(ALL)
  const rootRef = useRef<HTMLDivElement>(null)
  const roots = root === ALL ? ROOT_NAMES : [root]

  useEffect(() => {
    rootRef.current?.focus()
  }, [])

  return (
    <div
      className="preview"
      ref={rootRef}
      tabIndex={-1}
      onKeyDown={(e) => e.key === 'Escape' && !(e.target instanceof HTMLSelectElement) && onClose()}
    >
      <header className="preview-header chord-lookup-header">
        <h2>Chord lookup</h2>
        <label className="chord-lookup-select">
          Base chord
          <select value={root} onChange={(e) => setRoot(e.target.value)}>
            <option value={ALL}>None (all chords)</option>
            {NATURAL_ROOT_NAMES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </header>
      <div className="preview-scroll">
        {roots.map((name) => {
          const { major, minor } = chordFamilies(name)
          return (
            <section key={name} className="chord-lookup-root">
              <h2>{name}</h2>
              <Group title="Major" chords={major} />
              <Group title="Minor" chords={minor} />
            </section>
          )
        })}
      </div>
    </div>
  )
}
