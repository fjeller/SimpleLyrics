import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { closeDatabase, openDatabase, type DbHandle } from '../src/main/db/connection'
import { parseSongExport } from '../src/main/ipc/validation'
import { listCategories } from '../src/main/repositories/categories'
import { listInterpreters } from '../src/main/repositories/interpreters'
import { createSong, getSong, listSongs } from '../src/main/repositories/songs'
import { exportSongs, importSongs } from '../src/main/repositories/transfer'
import type { SongInput } from '../src/shared/types'

const migrations = resolve(__dirname, '../drizzle')

function song(overrides: Partial<SongInput> = {}): SongInput {
  return {
    title: 'Song',
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
let source: DbHandle
let target: DbHandle

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'simplelyrics-transfer-'))
  source = openDatabase(join(dir, 'source.sng'), migrations, 'create')
  target = openDatabase(join(dir, 'target.sng'), migrations, 'create')
})

afterEach(() => {
  closeDatabase(source)
  closeDatabase(target)
  rmSync(dir, { recursive: true, force: true })
})

describe('export and import', () => {
  it('round-trips all song fields, category and interpreters into another file', () => {
    createSong(
      source.db,
      song({
        title: 'Über den Wolken',
        key: 'G',
        originalKey: 'A',
        firstLine: 'Wind Nord-Ost',
        capo: 3,
        songText: 'line 1\nline 2',
        chords: 'G\nC D',
        newCategoryName: 'Schlager',
        newInterpreterNames: ['Reinhard Mey', 'Guest']
      })
    )
    createSong(source.db, song({ title: 'Plain' }))

    const text = JSON.stringify(exportSongs(source.db))
    const result = importSongs(target.db, parseSongExport(text))

    expect(result).toEqual({ imported: 2, skipped: 0, categoriesAdded: 1, interpretersAdded: 2 })
    const [first] = listSongs(target.db, { kind: 'all' })
    const detail = getSong(target.db, first.id)!
    expect(detail).toMatchObject({ title: 'Plain', capo: 0, key: null, interpreters: [] })
    const wolken = listSongs(target.db, { kind: 'all' }).find((s) => s.title === 'Über den Wolken')!
    expect(getSong(target.db, wolken.id)).toMatchObject({
      key: 'G',
      originalKey: 'A',
      firstLine: 'Wind Nord-Ost',
      capo: 3,
      songText: 'line 1\nline 2',
      chords: 'G\nC D'
    })
    expect(wolken.category).toBe('Schlager')
    expect(wolken.interpreters).toBe('Guest, Reinhard Mey')
  })

  it('skips songs that already exist and does not duplicate on a second import', () => {
    createSong(source.db, song({ title: 'Wild Rover', newInterpreterNames: ['Traditional'] }))
    const parsed = parseSongExport(JSON.stringify(exportSongs(source.db)))

    expect(importSongs(target.db, parsed).imported).toBe(1)
    expect(importSongs(target.db, parsed)).toMatchObject({ imported: 0, skipped: 1, categoriesAdded: 0, interpretersAdded: 0 })
    expect(listSongs(target.db, { kind: 'all' })).toHaveLength(1)
  })

  it('treats the same title with different interpreters as a different song', () => {
    createSong(target.db, song({ title: 'Hallelujah', newInterpreterNames: ['A'] }))
    createSong(source.db, song({ title: 'hallelujah', newInterpreterNames: ['B'] }))
    expect(importSongs(target.db, parseSongExport(JSON.stringify(exportSongs(source.db)))).imported).toBe(1)
  })

  it('keeps empty categories and interpreters', () => {
    const data = { format: 'simplelyrics-songs', version: 1, songs: [], categories: ['Empty'], interpreters: ['Nobody'] }
    importSongs(target.db, parseSongExport(JSON.stringify(data)))
    expect(listCategories(target.db).items.map((c) => c.name)).toEqual(['Empty'])
    expect(listInterpreters(target.db).items.map((i) => i.name)).toEqual(['Nobody'])
  })

  it('imports valid songs and reports invalid ones', () => {
    const data = {
      format: 'simplelyrics-songs',
      version: 1,
      songs: [{ title: 'Good', category: 'New' }, { title: 'Bad', capo: 99 }, { title: '  ' }, { title: 'Also good' }]
    }
    const parsed = parseSongExport(JSON.stringify(data))
    expect(parsed.invalid).toEqual(['Song 2 (Bad): Capo must be between 0 and 12.', 'Song 3: The title is required.'])

    expect(importSongs(target.db, parsed)).toMatchObject({ imported: 2, skipped: 0 })
    expect(listSongs(target.db, { kind: 'all' }).map((s) => s.title)).toEqual(['Also good', 'Good'])
  })
})

describe('parseSongExport', () => {
  it('rejects invalid input with readable messages', () => {
    expect(() => parseSongExport('not json')).toThrow(/not valid JSON/)
    expect(() => parseSongExport('{"songs":[]}')).toThrow(/not a SimpleLyrics song export/)
    expect(() => parseSongExport('{"format":"simplelyrics-songs","version":2,"songs":[]}')).toThrow(/unsupported version/)
    expect(() => parseSongExport('{"format":"simplelyrics-songs","version":1}')).toThrow()
    expect(parseSongExport('{"format":"simplelyrics-songs","version":1,"songs":[{"title":"  "}]}').invalid).toEqual(['Song 1: The title is required.'])
    expect(parseSongExport('{"format":"simplelyrics-songs","version":1,"songs":[{"title":"x","key":"12345678901"}]}').invalid[0]).toMatch(/Song 1 \(x\): .*key/)
    expect(parseSongExport('{"format":"simplelyrics-songs","version":1,"songs":[42,null]}').invalid).toHaveLength(2)
  })

  it('applies defaults for optional fields', () => {
    const parsed = parseSongExport('{"format":"simplelyrics-songs","version":1,"songs":[{"title":" Minimal "}]}')
    expect(parsed.songs[0]).toEqual({
      title: 'Minimal',
      key: null,
      originalKey: null,
      firstLine: null,
      capo: 0,
      songText: null,
      chords: null,
      category: null,
      interpreters: []
    })
  })
})
