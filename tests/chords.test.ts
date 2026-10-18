import { describe, expect, it } from 'vitest'
import { extractChords, findChordShape, parseChord } from '../src/shared/chords'

const names = (text: string): string[] => extractChords(text).map((c) => c.name)
const shape = (name: string): number[] | undefined => {
  const chord = parseChord(name)
  return chord ? (findChordShape(chord)?.frets ?? undefined) : undefined
}

describe('extractChords', () => {
  it('reads labelled lines with different separators', () => {
    expect(names('Verse: C-G-Em-D')).toEqual(['C', 'G', 'Em', 'D'])
    expect(names('Chorus: Em - C - G')).toEqual(['Em', 'C', 'G'])
    expect(names('Intro: G - G - C - Em')).toEqual(['G', 'C', 'Em'])
  })

  it('lists each chord once, in order of first appearance', () => {
    expect(names('Intro: G - C\nVerse: C-G-Em-D\nChorus: Em-D-G')).toEqual(['G', 'C', 'Em', 'D'])
  })

  it('treats enharmonic spellings as the same chord', () => {
    expect(names('Verse: A#-Bb')).toEqual(['A#'])
  })

  it('accepts unlabelled lines that only contain chords', () => {
    expect(names('G C D G')).toEqual(['G', 'C', 'D'])
  })

  it('ignores unlabelled lines containing ordinary words', () => {
    expect(names('A bridge to cross\nBad Dead Cage')).toEqual([])
  })

  it('ignores repeat markers and other words after a label', () => {
    expect(names('Verse: C G x2 (slowly)')).toEqual(['C', 'G'])
    expect(names('Chorus: |: Am F :|')).toEqual(['Am', 'F'])
  })

  it('recognises extended and slash chords', () => {
    expect(names('Verse: Cmaj7 F#m7 Dsus4 Cadd9 D/F# Bb')).toEqual(['Cmaj7', 'F#m7', 'Dsus4', 'Cadd9', 'D/F#', 'Bb'])
  })

  it('returns nothing for empty text', () => {
    expect(extractChords('')).toEqual([])
  })
})

describe('findChordShape', () => {
  it('uses the open shapes for common chords', () => {
    expect(shape('C')).toEqual([-1, 3, 2, 0, 1, 0])
    expect(shape('G')).toEqual([3, 2, 0, 0, 0, 3])
    expect(shape('Am')).toEqual([-1, 0, 2, 2, 1, 0])
    expect(shape('Em')).toEqual([0, 2, 2, 0, 0, 0])
    expect(shape('E7')).toEqual([0, 2, 0, 1, 0, 0])
  })

  it('derives barre chords from movable shapes', () => {
    expect(shape('F')).toEqual([1, 3, 3, 2, 1, 1])
    expect(shape('Bm')).toEqual([-1, 2, 4, 4, 3, 2])
    expect(shape('Bb')).toEqual([-1, 1, 3, 3, 3, 1])
    expect(shape('F#m')).toEqual([2, 4, 4, 2, 2, 2])
  })

  it('has no diagram for unsupported chords', () => {
    expect(shape('Cm7b5')).toBeUndefined()
    expect(shape('Am/E')).toBeUndefined()
  })

  it('rejects non-chords', () => {
    expect(parseChord('Bridge')).toBeNull()
    expect(parseChord('x2')).toBeNull()
  })
})
