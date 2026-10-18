import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import Database from 'better-sqlite3'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { closeDatabase, InvalidDatabaseFileError, openDatabase, type DbHandle } from '../src/main/db/connection'
import { createCategory, deleteCategory, listCategories, renameCategory } from '../src/main/repositories/categories'
import { createInterpreter, deleteInterpreter, listInterpreters } from '../src/main/repositories/interpreters'
import { createSong, deleteSong, getSong, listSongs, updateSong } from '../src/main/repositories/songs'
import type { SongInput } from '../src/shared/types'

const migrations = resolve(__dirname, '../drizzle')

function song(overrides: Partial<SongInput> = {}): SongInput {
  return {
    title: 'Wonderwall',
    key: null,
    originalKey: null,
    firstLine: null,
    capo: 0,
    songText: null,
    chords: null,
    categoryId: null,
    newCategoryName: null,
    interpreterIds: [],
    newInterpreterNames: [],
    ...overrides
  }
}

let dir: string
let handle: DbHandle

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'simplelyrics-'))
  handle = openDatabase(join(dir, 'test.sng'), migrations, 'create')
})

afterEach(() => {
  try {
    closeDatabase(handle)
  } catch {
    // already closed by the test
  }
  rmSync(dir, { recursive: true, force: true })
})

describe('database files', () => {
  it('reopens a created file', () => {
    createSong(handle.db, song())
    closeDatabase(handle)
    handle = openDatabase(handle.path, migrations, 'open')
    expect(listSongs(handle.db, { kind: 'all' })).toHaveLength(1)
  })

  it('rejects foreign SQLite files and non-database files', () => {
    const foreign = join(dir, 'foreign.sng')
    const other = new Database(foreign)
    other.exec('CREATE TABLE x(a)')
    other.close()
    expect(() => openDatabase(foreign, migrations, 'open')).toThrow(InvalidDatabaseFileError)

    const text = join(dir, 'text.sng')
    writeFileSync(text, 'this is not a database, just some text padding'.repeat(10))
    expect(() => openDatabase(text, migrations, 'open')).toThrow(InvalidDatabaseFileError)
  })

  it('rejects missing files', () => {
    expect(() => openDatabase(join(dir, 'missing.sng'), migrations, 'open')).toThrow(InvalidDatabaseFileError)
  })

  it('replaces an existing file when creating', () => {
    createSong(handle.db, song())
    closeDatabase(handle)
    handle = openDatabase(handle.path, migrations, 'create')
    expect(listSongs(handle.db, { kind: 'all' })).toHaveLength(0)
  })
})

describe('songs', () => {
  it('uses capo 0 as default and enforces limits in the database', () => {
    const id = createSong(handle.db, song())
    expect(getSong(handle.db, id)?.capo).toBe(0)
    expect(() => createSong(handle.db, song({ capo: 13 }))).toThrow()
    expect(() => createSong(handle.db, song({ key: 'x'.repeat(11) }))).toThrow()
    expect(() => createSong(handle.db, song({ firstLine: 'x'.repeat(101) }))).toThrow()
    expect(() => createSong(handle.db, song({ chords: 'x'.repeat(2001) }))).toThrow()
  })

  it('stores unlimited song text', () => {
    const text = 'la '.repeat(500_000)
    const id = createSong(handle.db, song({ songText: text }))
    expect(getSong(handle.db, id)?.songText).toBe(text)
  })

  it('auto-creates category and interpreters and reuses existing ones case-insensitively', () => {
    const existing = createInterpreter(handle.db, 'Oasis')
    const id = createSong(
      handle.db,
      song({ newCategoryName: ' Rock ', interpreterIds: [existing], newInterpreterNames: ['oasis', 'Noel Gallagher'] })
    )
    const detail = getSong(handle.db, id)
    expect(detail?.interpreters.map((i) => i.name)).toEqual(['Noel Gallagher', 'Oasis'])
    expect(listInterpreters(handle.db).items).toHaveLength(2)

    createSong(handle.db, song({ title: 'Other', newCategoryName: 'rock' }))
    const cats = listCategories(handle.db)
    expect(cats.items).toHaveLength(1)
    expect(cats.items[0]).toMatchObject({ name: 'Rock', songCount: 2 })
  })

  it('replaces interpreters and category on update', () => {
    const id = createSong(handle.db, song({ newCategoryName: 'Rock', newInterpreterNames: ['A', 'B'] }))
    updateSong(handle.db, id, song({ title: 'Renamed', newInterpreterNames: ['C'] }))
    const detail = getSong(handle.db, id)
    expect(detail?.title).toBe('Renamed')
    expect(detail?.categoryId).toBeNull()
    expect(detail?.interpreters.map((i) => i.name)).toEqual(['C'])
  })

  it('deletes a song and its relations', () => {
    const id = createSong(handle.db, song({ newInterpreterNames: ['A'] }))
    deleteSong(handle.db, id)
    expect(getSong(handle.db, id)).toBeNull()
    expect(listInterpreters(handle.db).items[0].songCount).toBe(0)
  })

  it('rolls back the whole save when something fails', () => {
    expect(() => createSong(handle.db, song({ capo: 99, newCategoryName: 'Ghost' }))).toThrow()
    expect(listCategories(handle.db).items).toHaveLength(0)
  })
})

describe('filters and search', () => {
  beforeEach(() => {
    createSong(handle.db, song({ title: 'Zebra', newCategoryName: 'Rock', newInterpreterNames: ['Band'], firstLine: 'Hello darkness' }))
    createSong(handle.db, song({ title: 'Äpfel', firstLine: 'Über den Wolken' }))
    createSong(handle.db, song({ title: 'apple', newCategoryName: 'Pop', newInterpreterNames: ['Band', 'Solo'] }))
  })

  it('lists all songs sorted by title, Unicode-aware', () => {
    const titles = listSongs(handle.db, { kind: 'all' }).map((s) => s.title)
    expect(titles).toEqual(['Äpfel', 'apple', 'Zebra'])
  })

  it('shows interpreters joined and category per row', () => {
    const apple = listSongs(handle.db, { kind: 'all' }).find((s) => s.title === 'apple')
    expect(apple).toMatchObject({ interpreters: 'Band, Solo', category: 'Pop' })
  })

  it('filters by category including the virtual "no category"', () => {
    const rock = listCategories(handle.db).items.find((c) => c.name === 'Rock')!
    expect(listSongs(handle.db, { kind: 'category', id: rock.id }).map((s) => s.title)).toEqual(['Zebra'])
    expect(listSongs(handle.db, { kind: 'category', id: null }).map((s) => s.title)).toEqual(['Äpfel'])
    expect(listCategories(handle.db)).toMatchObject({ totalSongs: 3, uncategorizedSongs: 1 })
  })

  it('filters by interpreter including the virtual "no interpreter"', () => {
    const band = listInterpreters(handle.db).items.find((i) => i.name === 'Band')!
    expect(listSongs(handle.db, { kind: 'interpreter', id: band.id })).toHaveLength(2)
    expect(listSongs(handle.db, { kind: 'interpreter', id: null }).map((s) => s.title)).toEqual(['Äpfel'])
    expect(listInterpreters(handle.db)).toMatchObject({ totalSongs: 3, withoutInterpreterSongs: 1 })
  })

  it('searches "contains" in title and first line, case-insensitive incl. umlauts', () => {
    const search = (term: string): string[] => listSongs(handle.db, { kind: 'search', term }).map((s) => s.title)
    expect(search('ebr')).toEqual(['Zebra'])
    expect(search('PFE')).toEqual(['Äpfel'])
    expect(search('über')).toEqual(['Äpfel'])
    expect(search('darkn')).toEqual(['Zebra'])
    expect(search('100%')).toEqual([])
  })
})

describe('categories and interpreters', () => {
  it('rejects duplicate and empty names', () => {
    createCategory(handle.db, 'Rock')
    expect(() => createCategory(handle.db, 'ROCK')).toThrow(/already exists/)
    expect(() => createCategory(handle.db, '   ')).toThrow(/empty/)
    const other = createCategory(handle.db, 'Pop')
    expect(() => renameCategory(handle.db, other, 'rock')).toThrow(/already exists/)
    renameCategory(handle.db, other, 'POP')
  })

  it('moves songs to "no category" when a category is deleted', () => {
    const id = createSong(handle.db, song({ newCategoryName: 'Rock' }))
    deleteCategory(handle.db, getSong(handle.db, id)!.categoryId!)
    expect(getSong(handle.db, id)?.categoryId).toBeNull()
    expect(listCategories(handle.db).uncategorizedSongs).toBe(1)
  })

  it('keeps songs when an interpreter is deleted', () => {
    const id = createSong(handle.db, song({ newInterpreterNames: ['Band'] }))
    deleteInterpreter(handle.db, getSong(handle.db, id)!.interpreters[0].id)
    expect(getSong(handle.db, id)?.interpreters).toEqual([])
    expect(listInterpreters(handle.db).withoutInterpreterSongs).toBe(1)
  })
})
