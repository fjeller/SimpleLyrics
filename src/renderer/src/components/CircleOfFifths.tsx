import { useEffect, useRef, useState } from 'react'
import { CIRCLE_KEYS, keyChords, keyLabel, wrapKeyIndex } from '../../../shared/circleOfFifths'
import type { KeyChord } from '../../../shared/circleOfFifths'

const CENTER = 260
const RINGS = {
  major: { outer: 250, inner: 175, text: 212 },
  minor: { outer: 175, inner: 115, text: 145 },
  signature: { outer: 115, inner: 72, text: 93 }
} as const

type Ring = keyof typeof RINGS

function point(radius: number, degrees: number): [number, number] {
  const angle = (degrees * Math.PI) / 180
  return [CENTER + radius * Math.sin(angle), CENTER - radius * Math.cos(angle)]
}

/** Ring segment of 30 degrees centred on the given angle (0 = top, clockwise). */
function segment(ring: Ring, centre: number): string {
  const { outer, inner } = RINGS[ring]
  const [x0, y0] = point(outer, centre - 15)
  const [x1, y1] = point(outer, centre + 15)
  const [x2, y2] = point(inner, centre + 15)
  const [x3, y3] = point(inner, centre - 15)
  return `M${x0} ${y0}A${outer} ${outer} 0 0 1 ${x1} ${y1}L${x2} ${y2}A${inner} ${inner} 0 0 0 ${x3} ${y3}Z`
}

function fontSize(ring: Ring, label: string): number {
  if (ring === 'major') return label.includes('/') ? 15 : 22
  if (ring === 'minor') return label.includes('/') ? 11 : 17
  return label.length > 2 ? 11 : 14
}

function describeSignature(signature: string): string {
  if (signature === '0') return 'no sharps or flats'
  return signature
    .split('/')
    .map((part) => {
      const count = parseInt(part, 10)
      return `${count} ${part.endsWith('♯') ? 'sharp' : 'flat'}${count === 1 ? '' : 's'}`
    })
    .join(' or ')
}

function ChordTable({ title, chords }: { title: string; chords: KeyChord[] }): React.JSX.Element {
  return (
    <table className="cof-chords">
      <caption>{title}</caption>
      <thead>
        <tr>
          {chords.map((c) => (
            <th key={c.numeral}>{c.numeral}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr>
          {chords.map((c) => (
            <td key={c.numeral}>{c.name}</td>
          ))}
        </tr>
      </tbody>
    </table>
  )
}

export function CircleOfFifths({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [selected, setSelected] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const key = CIRCLE_KEYS[selected]
  const chords = keyChords(selected)
  const majorName = keyLabel(key, 'major')
  const minorName = keyLabel(key, 'minor')
  const minorKey = minorName.replace(/m(?=\/|$)/g, '')

  useEffect(() => {
    rootRef.current?.focus()
  }, [])

  function stateOf(ring: Ring, index: number): string {
    const distance = wrapKeyIndex(index - selected)
    if (distance === 0) return 'tonic'
    return ring !== 'signature' && (distance === 1 || distance === CIRCLE_KEYS.length - 1) ? 'related' : ''
  }

  return (
    <div className="preview" ref={rootRef} tabIndex={-1} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <header className="preview-header">
        <h2>Circle of fifths</h2>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </header>
      <div className="preview-scroll">
        <div className="cof-page">
          <p className="cof-hint">Click a key to see its chords. The highlighted segments are the six chords of that key; the brightest are the key and its relative minor.</p>

          <svg className="cof-svg" viewBox="0 0 520 520" role="group" aria-label="Circle of fifths">
            {CIRCLE_KEYS.flatMap((entry, index) => {
              const angle = index * 30
              const labels: Record<Ring, string> = {
                major: keyLabel(entry, 'major'),
                minor: keyLabel(entry, 'minor'),
                signature: entry.signature
              }
              return (['major', 'minor', 'signature'] as Ring[]).map((ring) => {
                const [x, y] = point(RINGS[ring].text, angle)
                const label = labels[ring]
                const select = (): void => setSelected(index)
                return (
                  <g
                    key={`${ring}-${index}`}
                    className={`cof-wedge cof-${ring} ${stateOf(ring, index)}`}
                    onClick={select}
                    {...(ring === 'major'
                      ? {
                          role: 'button',
                          tabIndex: 0,
                          'aria-label': `Key of ${label} major`,
                          'aria-pressed': index === selected,
                          onKeyDown: (e: React.KeyboardEvent) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              select()
                            }
                          }
                        }
                      : {})}
                  >
                    <path d={segment(ring, angle)} />
                    <text x={x} y={y} fontSize={fontSize(ring, label)} fontWeight={ring === 'major' ? 700 : 400}>
                      {label}
                    </text>
                  </g>
                )
              })
            })}
            <circle className="cof-centre" cx={CENTER} cy={CENTER} r={RINGS.signature.inner - 4} />
            <text className="cof-centre-text" x={CENTER} y={CENTER - 12} fontSize={26} fontWeight={700}>
              {key.major}
            </text>
            <text className="cof-centre-text" x={CENTER} y={CENTER + 14} fontSize={15}>
              major
            </text>
          </svg>

          <section className="cof-selected">
            <h2>
              {majorName} major and {minorKey} minor
            </h2>
            <p>
              Key signature: <strong>{describeSignature(key.signature)}</strong>
            </p>
            <ChordTable title={`Chords of ${majorName} major`} chords={chords.major} />
            <ChordTable title={`The same chords in the relative minor, ${minorKey} minor`} chords={chords.minor} />
          </section>

          <section className="cof-help">
            <h2>How to use the circle of fifths</h2>

            <h3>What it shows</h3>
            <p>
              The circle of fifths arranges the 12 keys so that every step clockwise goes up a perfect fifth: C to G, G to D, and so on. After 12 steps you are back at the start. Every step counter-clockwise goes up a perfect fourth
              instead, for example C to F.
            </p>

            <h3>How to read the diagram</h3>
            <ul>
              <li>
                <strong>Outer ring:</strong> the major keys.
              </li>
              <li>
                <strong>Middle ring:</strong> the relative minor of each major key. A major key and its relative minor use the same notes, for example C major and A minor.
              </li>
              <li>
                <strong>Inner ring:</strong> the number of sharps (♯) or flats (♭) in the key signature. Every step clockwise adds one sharp, every step counter-clockwise adds one flat. At the bottom, F♯ major and G♭ major sound the same.
              </li>
            </ul>

            <h3>Find the chords of a key</h3>
            <p>The chords of a key sit next to each other on the circle. Pick a key and look at it and its two neighbours:</p>
            <ol>
              <li>
                The major chords <strong>I</strong>, <strong>IV</strong> and <strong>V</strong> are the key itself, its left neighbour (IV) and its right neighbour (V).
              </li>
              <li>
                The minor chords <strong>ii</strong>, <strong>iii</strong> and <strong>vi</strong> are directly below those three in the middle ring.
              </li>
              <li>
                The seventh chord <strong>vii°</strong> is diminished and is not on the circle.
              </li>
            </ol>
            <p>Click C in the diagram: C, F and G are highlighted in the outer ring and Dm, Em and Am below them. These six chords, plus Bdim, are all the chords of C major.</p>

            <h3>Find the key of a song</h3>
            <p>
              Collect the chords of the song. If they fit into three neighbouring keys and the minor chords below them, the key is the one in the middle. Example: G, C, D and Em. C, G and D are neighbours with G in the middle, and Em is
              the minor chord below G, so the song is in G major (or E minor).
            </p>

            <h3>Common chord progressions</h3>
            <ul>
              <li>
                <strong>I–IV–V</strong> (blues, rock and folk songs): the key and its two neighbours. In C: C, F, G.
              </li>
              <li>
                <strong>I–V–vi–IV</strong> (many pop songs): the key, its right neighbour, the minor below the key, and its left neighbour. In G: G, D, Em, C.
              </li>
              <li>
                <strong>ii–V–I</strong> (jazz and standards): each chord is a fifth below the previous one, which is one step counter-clockwise each time. In C: Dm, G, C.
              </li>
            </ul>

            <h3>Transpose a song</h3>
            <p>
              To play a song in another key, move every chord by the same number of steps around the circle. Minor chords move with the major ones. Example: C, F, G moved two steps clockwise becomes D, G, A, and Am becomes Bm.
            </p>

            <h3>Use it with a capo</h3>
            <p>
              A capo on fret N raises every chord by N semitones. The chords you write in the song are the shapes you play, and the capo field holds the fret. Example: G, C, D and Em with the capo on fret 2 sound as A, D, E and F♯m.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
