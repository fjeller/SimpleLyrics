import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { closeDatabase, openDatabase, type DbHandle } from '../src/main/db/connection'
import {
  createSetlist,
  deleteSetlist,
  duplicateSetlist,
  getSetlist,
  getSetlistForPrint,
  listSetlists,
  renameSetlist,
  saveSetlist,
  setlistUsage,
  uniqueSetlistName
} from '../src/main/repositories/setlists'
import { createSong, deleteSong } from '../src/main/repositories/songs'
import { normalizeSetlistItems, splitIntoSets } from '../src/shared/setlists'
import type { SetlistItemInput, SongInput } from '../src/shared/types'

const migrations = resolve(__dirname, '../drizzle')

function song(title: string, interpreters: string[] = []): SongInput {
  return {
    title,
    key: null,
    originalKey: null,
    firstLine: null,
    capo: 0,
    songText: null,
    chords: null,
    categoryId: null,
    newCategoryName: null,
    interpreterIds: [],
    newInterpreterNames: interpreters
  }
}

const S = (songId: number): SetlistItemInput => ({ kind: 'song', songId })
const B: SetlistItemInput = { kind: 'break' }

let dir: string
let handle: DbHandle
let a: number
let b: number
let c: number

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'simplelyrics-setlists-'))
  handle = openDatabase(join(dir, 'test.sng'), migrations, 'create')
  a = createSong(handle.db, song('Alpha', ['Band']))
  b = createSong(handle.db, song('Bravo'))
  c = createSong(handle.db, song('Charlie'))
})

afterEach(() => {
  closeDatabase(handle)
  rmSync(dir, { recursive: true, force: true })
})

const titles = (id: number): string[] => getSetlist(handle.db, id)!.items.map((i) => (i.kind === 'song' ? i.title : '|'))

describe('setlist helpers', () => {
  it('drops breaks that would create empty sets', () => {
    expect(normalizeSetlistItems([B, S(1), B, B, S(2), B])).toEqual([S(1), B, S(2)])
    expect(normalizeSetlistItems([B, B])).toEqual([])
  })

  it('splits the items into sets at the breaks', () => {
    expect(splitIntoSets([S(1), S(2), B, S(3)])).toEqual([[S(1), S(2)], [S(3)]])
    expect(splitIntoSets([S(1)])).toEqual([[S(1)]])
    expect(splitIntoSets([B, S(1), B, B])).toEqual([[S(1)]])
    expect(splitIntoSets([])).toEqual([])
  })
})

describe('setlists', () => {
  it('creates an empty setlist and lists it', () => {
    const id = createSetlist(handle.db, ' Pub gig ')
    expect(getSetlist(handle.db, id)).toEqual({ id, name: 'Pub gig', items: [] })
    expect(listSetlists(handle.db)).toEqual([{ id, name: 'Pub gig', songCount: 0, setCount: 0 }])
  })

  it('rejects empty and duplicate names, case-insensitively', () => {
    createSetlist(handle.db, 'Pub gig')
    expect(() => createSetlist(handle.db, 'PUB GIG')).toThrow(/already exists/)
    expect(() => createSetlist(handle.db, '  ')).toThrow(/must not be empty/)
  })

  it('saves songs and breaks in the exact order, with repeated songs', () => {
    const id = createSetlist(handle.db, 'Gig')
    saveSetlist(handle.db, id, 'Gig', [S(c), S(a), B, S(b), S(c)])
    expect(titles(id)).toEqual(['Charlie', 'Alpha', '|', 'Bravo', 'Charlie'])
    expect(getSetlist(handle.db, id)!.items[1]).toEqual({ kind: 'song', songId: a, title: 'Alpha', interpreters: 'Band' })
    expect(listSetlists(handle.db)[0]).toMatchObject({ songCount: 4, setCount: 2 })
  })

  it('removes breaks that would leave empty sets when saving', () => {
    const id = createSetlist(handle.db, 'Gig')
    saveSetlist(handle.db, id, 'Gig', [B, S(a), B, B, S(b), B])
    expect(titles(id)).toEqual(['Alpha', '|', 'Bravo'])
  })

  it('replaces the items and renames on save', () => {
    const id = createSetlist(handle.db, 'Gig')
    saveSetlist(handle.db, id, 'Gig', [S(a), S(b)])
    saveSetlist(handle.db, id, 'Wedding', [S(b)])
    expect(getSetlist(handle.db, id)!.name).toBe('Wedding')
    expect(titles(id)).toEqual(['Bravo'])
  })

  it('rejects unknown songs without changing the setlist', () => {
    const id = createSetlist(handle.db, 'Gig')
    saveSetlist(handle.db, id, 'Gig', [S(a)])
    expect(() => saveSetlist(handle.db, id, 'Gig', [S(a), S(9999)])).toThrow(/no longer exists/)
    expect(titles(id)).toEqual(['Alpha'])
  })

  it('renames and refuses names of other setlists', () => {
    const one = createSetlist(handle.db, 'One')
    createSetlist(handle.db, 'Two')
    renameSetlist(handle.db, one, 'one')
    expect(getSetlist(handle.db, one)!.name).toBe('one')
    expect(() => renameSetlist(handle.db, one, 'two')).toThrow(/already exists/)
  })

  it('duplicates a setlist with its items', () => {
    const id = createSetlist(handle.db, 'Gig')
    saveSetlist(handle.db, id, 'Gig', [S(a), B, S(b)])
    const copy = duplicateSetlist(handle.db, id, 'Gig copy')
    expect(titles(copy)).toEqual(['Alpha', '|', 'Bravo'])
    expect(() => duplicateSetlist(handle.db, id, 'gig')).toThrow(/already exists/)
  })

  it('deletes a setlist but keeps the songs', () => {
    const id = createSetlist(handle.db, 'Gig')
    saveSetlist(handle.db, id, 'Gig', [S(a)])
    deleteSetlist(handle.db, id)
    expect(listSetlists(handle.db)).toEqual([])
    expect(getSetlist(handle.db, id)).toBeNull()
  })

  it('removes a deleted song from every setlist and counts usage', () => {
    const one = createSetlist(handle.db, 'One')
    const two = createSetlist(handle.db, 'Two')
    saveSetlist(handle.db, one, 'One', [S(a), B, S(b), S(a)])
    saveSetlist(handle.db, two, 'Two', [S(a)])
    expect(setlistUsage(handle.db, a)).toBe(2)
    expect(setlistUsage(handle.db, c)).toBe(0)
    deleteSong(handle.db, a)
    expect(titles(one)).toEqual(['|', 'Bravo'])
    expect(listSetlists(handle.db).find((s) => s.id === one)).toMatchObject({ songCount: 1, setCount: 1 })
  })

  it('returns the full songs per set for printing', () => {
    const id = createSetlist(handle.db, 'Gig')
    saveSetlist(handle.db, id, 'Gig', [S(a), S(b), B, S(a)])
    const print = getSetlistForPrint(handle.db, id)!
    expect(print.name).toBe('Gig')
    expect(print.sets.map((set) => set.map((s) => s.title))).toEqual([['Alpha', 'Bravo'], ['Alpha']])
    expect(print.sets[0][0].interpreters).toEqual([expect.objectContaining({ name: 'Band' })])
  })

  it('numbers taken names', () => {
    createSetlist(handle.db, 'Gig')
    createSetlist(handle.db, 'Gig (2)')
    expect(uniqueSetlistName(handle.db, 'Free')).toBe('Free')
    expect(uniqueSetlistName(handle.db, 'gig')).toBe('gig (3)')
  })
})
