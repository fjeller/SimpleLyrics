import { describe, expect, it } from 'vitest'
import { CIRCLE_KEYS, keyChords, keyLabel, wrapKeyIndex } from '../src/shared/circleOfFifths'

const names = (chords: { name: string }[]): string[] => chords.map((c) => c.name)

describe('circle of fifths', () => {
  it('has 12 keys, each a fifth above the previous one', () => {
    expect(CIRCLE_KEYS.map((k) => k.major).slice(0, 4)).toEqual(['C', 'G', 'D', 'A'])
    expect(CIRCLE_KEYS).toHaveLength(12)
  })

  it('wraps around the circle', () => {
    expect(wrapKeyIndex(-1)).toBe(11)
    expect(wrapKeyIndex(12)).toBe(0)
  })

  it('labels the enharmonic key at the bottom with both spellings', () => {
    expect(keyLabel(CIRCLE_KEYS[6], 'major')).toBe('F♯/G♭')
    expect(keyLabel(CIRCLE_KEYS[0], 'minor')).toBe('Am')
  })
})

describe('keyChords', () => {
  it('gives the chords of C major and A minor', () => {
    const { major, minor } = keyChords(0)
    expect(names(major)).toEqual(['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim'])
    expect(major.map((c) => c.numeral)).toEqual(['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'])
    expect(names(minor)).toEqual(['Am', 'Bdim', 'C', 'Dm', 'Em', 'F', 'G'])
  })

  it('wraps around the top of the circle', () => {
    expect(names(keyChords(1).major)).toEqual(['G', 'Am', 'Bm', 'C', 'D', 'Em', 'F♯dim'])
    expect(names(keyChords(11).major)).toEqual(['F', 'Gm', 'Am', 'B♭', 'C', 'Dm', 'Edim'])
  })

  it('uses the same seven chords for a key and its relative minor', () => {
    for (let i = 0; i < CIRCLE_KEYS.length; i++) {
      const { major, minor } = keyChords(i)
      expect(names(minor).sort()).toEqual(names(major).sort())
    }
  })
})
