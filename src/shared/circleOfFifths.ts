/** Data of the circle of fifths and the chords of each key. */

export interface CircleKey {
  /** Major key, spelled with sharps where two spellings exist. */
  major: string
  /** The enharmonic spelling, only for the bottom of the circle. */
  majorAlt?: string
  /** Relative minor key as a chord name. */
  minor: string
  minorAlt?: string
  /** Key signature, e.g. "2♯", "3♭" or "0". */
  signature: string
}

/** The 12 keys clockwise from the top, each step a perfect fifth up. */
export const CIRCLE_KEYS: readonly CircleKey[] = [
  { major: 'C', minor: 'Am', signature: '0' },
  { major: 'G', minor: 'Em', signature: '1♯' },
  { major: 'D', minor: 'Bm', signature: '2♯' },
  { major: 'A', minor: 'F♯m', signature: '3♯' },
  { major: 'E', minor: 'C♯m', signature: '4♯' },
  { major: 'B', minor: 'G♯m', signature: '5♯' },
  { major: 'F♯', majorAlt: 'G♭', minor: 'D♯m', minorAlt: 'E♭m', signature: '6♯/6♭' },
  { major: 'D♭', minor: 'B♭m', signature: '5♭' },
  { major: 'A♭', minor: 'Fm', signature: '4♭' },
  { major: 'E♭', minor: 'Cm', signature: '3♭' },
  { major: 'B♭', minor: 'Gm', signature: '2♭' },
  { major: 'F', minor: 'Dm', signature: '1♭' }
]

/** The diminished chord on the seventh degree of each major key. */
const DIMINISHED = ['Bdim', 'F♯dim', 'C♯dim', 'G♯dim', 'D♯dim', 'A♯dim', 'E♯dim', 'Cdim', 'Gdim', 'Ddim', 'Adim', 'Edim']

export interface KeyChord {
  /** Roman numeral of the chord within the key. */
  numeral: string
  name: string
}

export const wrapKeyIndex = (index: number): number => (index + CIRCLE_KEYS.length) % CIRCLE_KEYS.length

export function keyLabel(key: CircleKey, kind: 'major' | 'minor'): string {
  const [main, alt] = kind === 'major' ? [key.major, key.majorAlt] : [key.minor, key.minorAlt]
  return alt ? `${main}/${alt}` : main
}

/**
 * The seven chords of the key at the given position, once read as the major key and once as its
 * relative minor. Position i is the key itself, i - 1 the key a fifth below (IV) and i + 1 the key a fifth above (V).
 */
export function keyChords(index: number): { major: KeyChord[]; minor: KeyChord[] } {
  const at = (offset: number): CircleKey => CIRCLE_KEYS[wrapKeyIndex(index + offset)]
  const major = at(0).major
  const dim = DIMINISHED[wrapKeyIndex(index)]
  return {
    major: [
      { numeral: 'I', name: major },
      { numeral: 'ii', name: at(-1).minor },
      { numeral: 'iii', name: at(1).minor },
      { numeral: 'IV', name: at(-1).major },
      { numeral: 'V', name: at(1).major },
      { numeral: 'vi', name: at(0).minor },
      { numeral: 'vii°', name: dim }
    ],
    minor: [
      { numeral: 'i', name: at(0).minor },
      { numeral: 'ii°', name: dim },
      { numeral: 'III', name: major },
      { numeral: 'iv', name: at(-1).minor },
      { numeral: 'v', name: at(1).minor },
      { numeral: 'VI', name: at(-1).major },
      { numeral: 'VII', name: at(1).major }
    ]
  }
}
