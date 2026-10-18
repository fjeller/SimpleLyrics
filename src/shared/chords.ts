/** Chord parsing and standard guitar fingerings, independent of any UI. */

export interface ParsedChord {
  /** Display name as written, e.g. "F#m7" or "D/F#". */
  name: string
  /** Spelling-independent identity, so "A#" and "Bb" count as the same chord. */
  key: string
  /** Pitch class of the root, 0 = C. */
  root: number
  /** Normalised quality ("" = major, "m", "7", "maj7", ...) or the raw suffix when unknown. */
  quality: string
  /** Pitch class of the bass note for slash chords. */
  bass: number | null
}

export interface ChordShape {
  /** One entry per string from low E to high E: -1 = muted, 0 = open, n = fret. */
  frets: number[]
  /** Fret of the movable shape's root position; 0 for open-position chords. */
  position: number
  /** Barre across the string indices `from`..`to` (0 = low E) at `fret`. */
  barre: { fret: number; from: number; to: number } | null
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
export const ROOT_NAMES: readonly string[] = NOTE_NAMES
export const NATURAL_ROOT_NAMES: readonly string[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
const NATURAL_SEMITONES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }

const QUALITY_ALIASES: Record<string, string> = {
  '': '',
  maj: '',
  m: 'm',
  min: 'm',
  '7': '7',
  m7: 'm7',
  min7: 'm7',
  maj7: 'maj7',
  M7: 'maj7',
  dim: 'dim',
  '°': 'dim',
  aug: 'aug',
  '+': 'aug',
  sus: 'sus4',
  sus4: 'sus4',
  sus2: 'sus2',
  add9: 'add9',
  '6': '6',
  '5': '5'
}

const SUFFIX_PATTERN = /^(?:maj|min|m|M|dim|aug|sus|add|\+|°|\d|b|#)*$/
const NOTE_PATTERN = /^([A-G])([#b♯♭]?)(.*)$/

function accidental(symbol: string): number {
  return symbol === '#' || symbol === '♯' ? 1 : symbol === 'b' || symbol === '♭' ? -1 : 0
}

function parseNote(text: string): { semitone: number; rest: string } | null {
  const match = NOTE_PATTERN.exec(text)
  if (!match) return null
  const semitone = (((NATURAL_SEMITONES[match[1]] + accidental(match[2])) % 12) + 12) % 12
  return { semitone, rest: match[3] }
}

/** Returns null when the token is not a chord name. */
export function parseChord(token: string): ParsedChord | null {
  const parts = token.split('/')
  if (parts.length > 2) return null

  const main = parseNote(parts[0])
  if (!main || !SUFFIX_PATTERN.test(main.rest)) return null

  let bass: number | null = null
  if (parts.length === 2) {
    const bassNote = parseNote(parts[1])
    if (!bassNote || bassNote.rest !== '') return null
    bass = bassNote.semitone
  }

  const quality = QUALITY_ALIASES[main.rest] ?? main.rest
  return { name: token, key: `${main.semitone}|${quality}|${bass ?? ''}`, root: main.semitone, quality, bass }
}

const IGNORED_TOKEN = /^(?:x\d+|\d+x?|%|\.+|n\.?c\.?)$/i
const SEPARATORS = /[\s\-–—,|:;>()[\]]+/

/**
 * Collects the distinct chords of a chords text in order of first appearance.
 * Lines like "Verse: C-G-Em-D" or "Em - C - G" work; a line without a label only counts
 * if everything on it is a chord, so ordinary words are not mistaken for chords.
 */
export function extractChords(text: string): ParsedChord[] {
  const found = new Map<string, ParsedChord>()

  for (const line of text.split(/\r?\n/)) {
    const colon = line.indexOf(':')
    const before = colon > 0 ? line.slice(0, colon) : ''
    const hasLabel = /\p{L}/u.test(before) && !before.includes('|')
    const body = hasLabel ? line.slice(colon + 1) : line

    const chords: ParsedChord[] = []
    let onlyChords = true
    for (const token of body.split(SEPARATORS).filter(Boolean)) {
      if (IGNORED_TOKEN.test(token)) continue
      const chord = parseChord(token)
      if (chord) chords.push(chord)
      else onlyChords = false
    }

    if (!hasLabel && !onlyChords) continue
    for (const chord of chords) if (!found.has(chord.key)) found.set(chord.key, chord)
  }

  return [...found.values()]
}

// Offsets from the barre fret per string (low E first); -1 = muted.
const E_SHAPES: Record<string, number[]> = {
  '': [0, 2, 2, 1, 0, 0],
  m: [0, 2, 2, 0, 0, 0],
  '7': [0, 2, 0, 1, 0, 0],
  m7: [0, 2, 0, 0, 0, 0],
  maj7: [0, 2, 1, 1, 0, 0],
  sus4: [0, 2, 2, 2, 0, 0],
  '5': [0, 2, 2, -1, -1, -1]
}

const A_SHAPES: Record<string, number[]> = {
  '': [-1, 0, 2, 2, 2, 0],
  m: [-1, 0, 2, 2, 1, 0],
  '7': [-1, 0, 2, 0, 2, 0],
  m7: [-1, 0, 2, 0, 1, 0],
  maj7: [-1, 0, 2, 1, 2, 0],
  sus4: [-1, 0, 2, 2, 3, 0],
  sus2: [-1, 0, 2, 2, 0, 0],
  dim: [-1, 0, 1, 2, 1, -1],
  aug: [-1, 0, 3, 2, 2, 1],
  '6': [-1, 0, 2, 2, 2, 2],
  '5': [-1, 0, 2, 2, -1, -1]
}

// Open-position chords that are not an E or A shape; absolute frets.
const OPEN_SHAPES: Record<string, number[]> = {
  C: [-1, 3, 2, 0, 1, 0],
  C7: [-1, 3, 2, 3, 1, 0],
  Cmaj7: [-1, 3, 2, 0, 0, 0],
  Cadd9: [-1, 3, 2, 0, 3, 0],
  D: [-1, -1, 0, 2, 3, 2],
  Dm: [-1, -1, 0, 2, 3, 1],
  D7: [-1, -1, 0, 2, 1, 2],
  Dmaj7: [-1, -1, 0, 2, 2, 2],
  Dm7: [-1, -1, 0, 2, 1, 1],
  Dsus2: [-1, -1, 0, 2, 3, 0],
  Dsus4: [-1, -1, 0, 2, 3, 3],
  D6: [-1, -1, 0, 2, 0, 2],
  Fmaj7: [-1, -1, 3, 2, 1, 0],
  G: [3, 2, 0, 0, 0, 3],
  G7: [3, 2, 0, 0, 0, 1],
  Gmaj7: [3, 2, 0, 0, 0, 2],
  G6: [3, 2, 0, 0, 0, 0],
  B7: [-1, 2, 1, 2, 0, 2],
  'D/F#': [2, -1, 0, 2, 3, 2],
  'C/G': [3, 3, 2, 0, 1, 0],
  'G/B': [-1, 2, 0, 0, 0, 3]
}

function movableShape(offsets: number[], fret: number): ChordShape {
  const frets = offsets.map((o) => (o < 0 ? -1 : o + fret))
  const barred = offsets.flatMap((o, i) => (o === 0 ? [i] : []))
  const barre = fret > 0 && barred.length >= 2 ? { fret, from: barred[0], to: barred[barred.length - 1] } : null
  return { frets, position: fret, barre }
}

/** All standard fingerings of the chord, open position first, then movable shapes by ascending fret. */
export function findChordShapes(chord: ParsedChord): ChordShape[] {
  const bassName = chord.bass === null ? '' : `/${NOTE_NAMES[chord.bass]}`
  const open = OPEN_SHAPES[`${NOTE_NAMES[chord.root]}${chord.quality}${bassName}`]
  const shapes: ChordShape[] = open ? [{ frets: open, position: 0, barre: null }] : []
  if (chord.bass !== null) return shapes

  const e = E_SHAPES[chord.quality]
  const a = A_SHAPES[chord.quality]
  const movable: ChordShape[] = []
  if (e) movable.push(movableShape(e, (chord.root - 4 + 12) % 12))
  if (a) movable.push(movableShape(a, (chord.root - 9 + 12) % 12))
  movable.sort((x, y) => x.position - y.position)

  for (const shape of movable) {
    if (!shapes.some((s) => s.frets.join() === shape.frets.join())) shapes.push(shape)
  }
  return shapes
}

/** The preferred standard fingering for the chord, or null when there is none (e.g. extended chords). */
export function findChordShape(chord: ParsedChord): ChordShape | null {
  return findChordShapes(chord)[0] ?? null
}

const MAJOR_SUFFIXES = ['', '7', 'maj7', '6', 'add9', 'sus2', 'sus4', 'aug', '5']
const MINOR_SUFFIXES = ['m', 'm7', 'dim']

export interface ChordFamilies {
  major: ParsedChord[]
  minor: ParsedChord[]
}

/** All chords of one root that have a standard fingering, split into major and minor variants. */
export function chordFamilies(rootName: string): ChordFamilies {
  const build = (suffixes: string[]): ParsedChord[] =>
    suffixes.flatMap((suffix) => {
      const chord = parseChord(`${rootName}${suffix}`)
      return chord && findChordShape(chord) ? [chord] : []
    })
  return { major: build(MAJOR_SUFFIXES), minor: build(MINOR_SUFFIXES) }
}
