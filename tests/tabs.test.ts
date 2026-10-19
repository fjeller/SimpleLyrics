import { describe, expect, it } from 'vitest'
import { splitSongText, TAB_MAX_COLS } from '../src/shared/tabs'
import type { SongSegment, Tab } from '../src/shared/tabs'

const SAMPLE = [
  'e|------13---------12----|------10--------8---|-----5-------3---|-3\\1-------------|',
  'B|-----------------------|--------------------|-----------------|-----------------|',
  'G|---14----14---12----12-|---10----10---9---9-|---5---5---4---4-|-4\\2-------------|',
  'D|-0----------0----------|-0----------0-------|-0-------0-------|---------------0-|',
  'A|-----------------------|--------------------|-----------------|-----------------|',
  'E|-----------------------|--------------------|-----------------|-----------------|'
].join('\n')

const tabs = (segments: SongSegment[]): Tab[] => segments.flatMap((s) => (s.kind === 'tab' ? [s.tab] : []))

describe('splitSongText', () => {
  it('returns plain text unchanged', () => {
    expect(splitSongText('Amazing grace\nHow sweet the sound')).toEqual([{ kind: 'text', text: 'Amazing grace\nHow sweet the sound' }])
  })

  it('returns nothing for empty text', () => {
    expect(splitSongText('')).toEqual([])
  })

  it('detects a six-string tab between lyrics', () => {
    const segments = splitSongText(`Intro\n\n${SAMPLE}\n\nVerse 1`)
    expect(segments.map((s) => s.kind)).toEqual(['text', 'tab', 'text'])
    expect(segments[0]).toEqual({ kind: 'text', text: 'Intro' })
    expect(segments[2]).toEqual({ kind: 'text', text: 'Verse 1' })
  })

  it('reads string names and note positions', () => {
    const [tab] = tabs(splitSongText(SAMPLE))
    const [first] = tab.rows
    expect(first.strings.map((s) => s.name)).toEqual(['e', 'B', 'G', 'D', 'A', 'E'])
    const high = first.strings[0].tokens
    expect(high.filter((t) => t.kind === 'fret').map((t) => (t.kind === 'fret' ? t.value : ''))).toEqual(['13', '12', '10', '8'])
    expect(high[0]).toEqual({ kind: 'fret', col: 7, width: 2, value: '13' })
    expect(first.strings[1].tokens).toEqual([])
  })

  it('reads slides as marks between fret numbers', () => {
    const rows = tabs(splitSongText(SAMPLE))[0].rows
    const last = rows[rows.length - 1]
    const symbols = last.strings[0].tokens.map((t) => (t.kind === 'fret' ? t.value : t.symbol))
    expect(symbols.slice(-3)).toEqual(['3', '\\', '1'])
  })

  it('breaks long tabs into rows that start and end on a bar line', () => {
    const [tab] = tabs(splitSongText(SAMPLE))
    expect(tab.rows.length).toBeGreaterThan(1)
    for (const row of tab.rows) {
      expect(row.cols).toBeLessThanOrEqual(TAB_MAX_COLS)
      expect(row.bars[0]).toBe(0)
      expect(row.bars[row.bars.length - 1]).toBe(row.cols - 1)
    }
  })

  it('keeps two tabs written directly after each other apart', () => {
    const two = `${SAMPLE}\n${SAMPLE}`
    expect(tabs(splitSongText(two))).toHaveLength(2)
  })

  it('ignores runs with fewer than four tab lines', () => {
    const three = 'e|---0---|\nB|---1---|\nG|---2---|'
    expect(splitSongText(three).every((s) => s.kind === 'text')).toBe(true)
  })

  it('does not mistake lyrics for tabs', () => {
    const lyrics = 'Dead and gone\nBridge --- chorus\nA - b - c\ne - note\nGreat --- big'
    expect(splitSongText(lyrics).every((s) => s.kind === 'text')).toBe(true)
  })

  it('treats a bass tab with four strings as a tab', () => {
    const bass = 'G|---0---|\nD|---2---|\nA|---3---|\nE|---0---|'
    expect(tabs(splitSongText(bass))).toHaveLength(1)
  })

  it('pads lines of different lengths', () => {
    const uneven = 'e|---0---|\nB|---1--|\nG|---2---|\nD|---3---|\nA|---4---|\nE|---5---|'
    const [tab] = tabs(splitSongText(uneven))
    expect(tab.rows[0].cols).toBe(9)
  })
})
