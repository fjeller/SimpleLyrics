/** A setlist is an ordered list of songs and breaks; the songs between breaks form the sets. */

export type SetlistEntry = { kind: 'song' } | { kind: 'break' }

/** Drops breaks that would create empty sets: at the start, at the end and directly after another break. */
export function normalizeSetlistItems<T extends SetlistEntry>(items: readonly T[]): T[] {
  const result: T[] = []
  for (const item of items) {
    if (item.kind === 'break' && (result.length === 0 || result[result.length - 1].kind === 'break')) continue
    result.push(item)
  }
  while (result.length > 0 && result[result.length - 1].kind === 'break') result.pop()
  return result
}

/** Splits the items at the breaks into sets of songs; empty sets are left out. */
export function splitIntoSets<T extends SetlistEntry>(items: readonly T[]): Extract<T, { kind: 'song' }>[][] {
  const sets: Extract<T, { kind: 'song' }>[][] = []
  let current: Extract<T, { kind: 'song' }>[] = []
  for (const item of items) {
    if (item.kind === 'break') {
      if (current.length > 0) sets.push(current)
      current = []
    } else {
      current.push(item as Extract<T, { kind: 'song' }>)
    }
  }
  if (current.length > 0) sets.push(current)
  return sets
}
