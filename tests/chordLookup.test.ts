import { describe, expect, it } from 'vitest'
import { chordFamilies, findChordShapes, NATURAL_ROOT_NAMES, parseChord, ROOT_NAMES } from '../src/shared/chords'

const frets = (name: string): number[][] => findChordShapes(parseChord(name)!).map((s) => s.frets)

describe('findChordShapes', () => {
  it('lists the open shape followed by the barre shapes', () => {
    expect(frets('A')).toEqual([
      [-1, 0, 2, 2, 2, 0],
      [5, 7, 7, 6, 5, 5]
    ])
    expect(frets('C')).toEqual([
      [-1, 3, 2, 0, 1, 0],
      [-1, 3, 5, 5, 5, 3],
      [8, 10, 10, 9, 8, 8]
    ])
  })

  it('records the position of each shape', () => {
    expect(findChordShapes(parseChord('A')!).map((s) => s.position)).toEqual([0, 5])
  })

  it('has a single shape where only one exists', () => {
    expect(frets('D/F#')).toEqual([[2, -1, 0, 2, 3, 2]])
  })
})


describe('chordFamilies', () => {
  it('splits a root into major and minor variants', () => {
    const { major, minor } = chordFamilies('C')
    expect(major.map((c) => c.name)).toEqual(['C', 'C7', 'Cmaj7', 'C6', 'Cadd9', 'Csus2', 'Csus4', 'Caug', 'C5'])
    expect(minor.map((c) => c.name)).toEqual(['Cm', 'Cm7', 'Cdim'])
  })

  it('only lists chords that have a fingering', () => {
    expect(chordFamilies('D').major.map((c) => c.name)).not.toContain('Dadd9')
  })

  it('covers every root', () => {
    expect(NATURAL_ROOT_NAMES).toHaveLength(7)
    for (const root of ROOT_NAMES) {
      const { major, minor } = chordFamilies(root)
      expect(major.length).toBeGreaterThanOrEqual(8)
      expect(minor).toHaveLength(3)
    }
  })
})
