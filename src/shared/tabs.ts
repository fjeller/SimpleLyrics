/** Detection and parsing of ASCII guitar tablature inside a song text. */

export type TabToken =
  | { kind: 'fret'; col: number; width: number; value: string }
  | { kind: 'mark'; col: number; symbol: string }

export interface TabString {
  /** String name as written (e, B, G, D, A, E), empty if the tab has none. */
  name: string
  tokens: TabToken[]
}

export interface TabRow {
  strings: TabString[]
  /** Columns of the bar lines. */
  bars: number[]
  cols: number
}

export interface Tab {
  rows: TabRow[]
}

export type SongSegment = { kind: 'text'; text: string } | { kind: 'tab'; tab: Tab }

/** Longest row in characters; longer tabs are broken into several rows at bar lines. */
export const TAB_MAX_COLS = 56

const MIN_STRINGS = 4
const MAX_STRINGS = 8
const LINE = /^\s*([A-Ga-g][#b]?)?\s*(?=[|:-])(.*)$/
const BODY = /^[-\d|:hpbrstxv/\\~^()<>.*=\s]*$/i

interface TabLine {
  name: string
  body: string
}

function parseTabLine(line: string): TabLine | null {
  const match = LINE.exec(line.trimEnd())
  if (!match) return null
  const body = match[2]
  if (!BODY.test(body) || (body.match(/-/g)?.length ?? 0) < 3) return null
  return { name: match[1] ?? '', body }
}

/** Splits a run of consecutive tab lines into systems of 4 to 8 strings. */
function splitRun(run: TabLine[]): TabLine[][] {
  const named = run.every((l) => l.name !== '')
  let systems: TabLine[][]

  if (named) {
    systems = []
    let current: TabLine[] = []
    for (const line of run) {
      if (current.some((l) => l.name === line.name)) {
        systems.push(current)
        current = []
      }
      current.push(line)
    }
    systems.push(current)
  } else if (run.length <= MAX_STRINGS) {
    systems = [run]
  } else {
    const size = run.length % 6 === 0 ? 6 : run.length % 4 === 0 ? 4 : 0
    systems = size === 0 ? [] : Array.from({ length: run.length / size }, (_, i) => run.slice(i * size, (i + 1) * size))
  }

  return systems.filter((s) => s.length >= MIN_STRINGS && s.length <= MAX_STRINGS)
}

function tokenize(text: string): TabToken[] {
  const tokens: TabToken[] = []
  let i = 0
  while (i < text.length) {
    const ch = text[i]
    if (ch >= '0' && ch <= '9') {
      let end = i
      while (end < text.length && text[end] >= '0' && text[end] <= '9') end++
      tokens.push({ kind: 'fret', col: i, width: end - i, value: text.slice(i, end) })
      i = end
      continue
    }
    if (!'-|: \t'.includes(ch)) tokens.push({ kind: 'mark', col: i, symbol: ch })
    i++
  }
  return tokens
}

function buildTab(system: TabLine[]): Tab {
  const width = Math.max(...system.map((l) => l.body.length))
  const bodies = system.map((l) => l.body.padEnd(width, '-'))

  const barsNeeded = Math.max(2, Math.ceil(system.length / 2))
  const bars: number[] = []
  for (let col = 0; col < width; col++) {
    if (bodies.filter((b) => b[col] === '|').length >= barsNeeded) bars.push(col)
  }

  // Rows start and end on a bar line, which is drawn at both ends.
  const ranges: [number, number][] = []
  let start = 0
  while (width - start > TAB_MAX_COLS) {
    const limit = start + TAB_MAX_COLS
    const bar = bars.filter((b) => b > start && b < limit).pop()
    if (bar !== undefined) {
      ranges.push([start, bar + 1])
      start = bar
      continue
    }
    let cut = limit - 1
    while (cut > start + 8 && !bodies.every((b) => b[cut] === '-' || b[cut] === ' ')) cut--
    ranges.push([start, cut + 1])
    start = cut + 1
  }
  ranges.push([start, width])

  return {
    rows: ranges.map(([from, to]) => ({
      cols: to - from,
      bars: bars.filter((b) => b >= from && b < to).map((b) => b - from),
      strings: system.map((line, i) => ({ name: line.name, tokens: tokenize(bodies[i].slice(from, to)) }))
    }))
  }
}

const isBlank = (line: string): boolean => line.trim() === ''

/** Splits a song text into plain text and tab blocks. Tabs need 4 to 8 consecutive tab lines. */
export function splitSongText(text: string): SongSegment[] {
  const lines = text.split(/\r?\n/)
  const parsed = lines.map(parseTabLine)
  const segments: SongSegment[] = []
  let pending: string[] = []

  const flush = (): void => {
    if (pending.length > 0) segments.push({ kind: 'text', text: pending.join('\n') })
    pending = []
  }

  let i = 0
  while (i < lines.length) {
    if (parsed[i] === null) {
      pending.push(lines[i++])
      continue
    }
    let end = i
    while (end < lines.length && parsed[end] !== null) end++
    const run = parsed.slice(i, end) as TabLine[]
    const systems = splitRun(run)

    if (systems.length === 0) {
      pending.push(...lines.slice(i, end))
    } else {
      flush()
      for (const system of systems) segments.push({ kind: 'tab', tab: buildTab(system) })
    }
    i = end
  }
  flush()

  // Blank lines next to a tab are replaced by the tab's own spacing.
  return segments.flatMap<SongSegment>((segment, index) => {
    if (segment.kind === 'tab') return [segment]
    const textLines = segment.text.split('\n')
    if (segments[index - 1]?.kind === 'tab') while (textLines.length > 0 && isBlank(textLines[0])) textLines.shift()
    if (segments[index + 1]?.kind === 'tab') while (textLines.length > 0 && isBlank(textLines[textLines.length - 1])) textLines.pop()
    return textLines.every(isBlank) ? [] : [{ kind: 'text' as const, text: textLines.join('\n') }]
  })
}
