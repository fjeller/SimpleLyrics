import type { ChordShape, ParsedChord } from '../../../shared/chords'
import { findChordShape } from '../../../shared/chords'

const LEFT = 22
const STRING_GAP = 13
const TOP = 22
const FRET_GAP = 15
const ROWS = 5
const STRINGS = 6

interface ChordDiagramProps {
  chord: ParsedChord
  /** Fingering to draw; defaults to the chord's preferred one. */
  shape?: ChordShape | null
  /** Small text below the diagram, e.g. the position. */
  note?: string
}

export function ChordDiagram({ chord, shape: given, note }: ChordDiagramProps): React.JSX.Element {
  const shape = given === undefined ? findChordShape(chord) : given
  if (!shape) {
    return (
      <figure className="chord-card">
        <figcaption>{chord.name}</figcaption>
        <div className="chord-missing">No diagram</div>
      </figure>
    )
  }

  const pressed = shape.frets.filter((f) => f > 0)
  const lowest = pressed.length === 0 ? 1 : Math.min(...pressed)
  const baseFret = pressed.length === 0 || (Math.max(...pressed) <= ROWS && lowest <= 2) ? 1 : lowest
  const x = (string: number): number => LEFT + string * STRING_GAP
  const rowY = (fret: number): number => TOP + (fret - baseFret + 0.5) * FRET_GAP
  const bottom = TOP + ROWS * FRET_GAP
  const { barre } = shape

  return (
    <figure className="chord-card">
      <figcaption>{chord.name}</figcaption>
      <svg viewBox={`0 0 ${LEFT + (STRINGS - 1) * STRING_GAP + STRING_GAP} ${bottom + 6}`} role="img" aria-label={`Fingering for ${chord.name}`}>
        <g stroke="currentColor" strokeWidth={1} fill="none">
          {Array.from({ length: ROWS + 1 }, (_, i) => (
            <line key={`f${i}`} x1={x(0)} x2={x(STRINGS - 1)} y1={TOP + i * FRET_GAP} y2={TOP + i * FRET_GAP} />
          ))}
          {Array.from({ length: STRINGS }, (_, i) => (
            <line key={`s${i}`} x1={x(i)} x2={x(i)} y1={TOP} y2={bottom} />
          ))}
          {shape.frets.map((fret, i) =>
            fret === 0 ? (
              <circle key={`o${i}`} cx={x(i)} cy={TOP - 8} r={3.5} />
            ) : fret < 0 ? (
              <path key={`m${i}`} d={`M${x(i) - 3.5} ${TOP - 11.5}l7 7m0 -7l-7 7`} />
            ) : null
          )}
        </g>
        {baseFret === 1 ? (
          <rect x={x(0)} y={TOP - 2} width={x(STRINGS - 1) - x(0)} height={3.5} fill="currentColor" />
        ) : (
          <text x={LEFT - 6} y={rowY(baseFret) + 3.5} textAnchor="end" fontSize={10} fill="currentColor">
            {baseFret}fr
          </text>
        )}
        {barre && <line x1={x(barre.from)} x2={x(barre.to)} y1={rowY(barre.fret)} y2={rowY(barre.fret)} stroke="currentColor" strokeWidth={9} strokeLinecap="round" />}
        {shape.frets.map((fret, i) =>
          fret > 0 && !(barre && fret === barre.fret && i >= barre.from && i <= barre.to) ? (
            <circle key={`d${i}`} cx={x(i)} cy={rowY(fret)} r={5} fill="currentColor" />
          ) : null
        )}
      </svg>
      {note && <div className="chord-note">{note}</div>}
    </figure>
  )
}
