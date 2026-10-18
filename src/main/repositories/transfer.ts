import { eq, sql } from 'drizzle-orm'
import { normalizeName, type AppDb } from '../db/connection'
import { categories, interpreters, songInterpreters, songs } from '../db/schema'
import { getOrCreateCategory } from './categories'
import { getOrCreateInterpreter } from './interpreters'
import { insertSong } from './songs'
import { EXPORT_FORMAT, EXPORT_VERSION } from '../../shared/types'
import type { ExportedSong, ImportResult, SongExport, SongInput } from '../../shared/types'

export function exportSongs(db: AppDb): SongExport {
  const rows = db
    .select({
      id: songs.id,
      title: songs.title,
      key: songs.key,
      originalKey: songs.originalKey,
      firstLine: songs.firstLine,
      capo: songs.capo,
      songText: songs.songText,
      chords: songs.chords,
      category: categories.name
    })
    .from(songs)
    .leftJoin(categories, eq(songs.categoryId, categories.id))
    .orderBy(sql`sort_key(${songs.title})`, songs.id)
    .all()

  const links = db
    .select({ songId: songInterpreters.songId, name: interpreters.name })
    .from(songInterpreters)
    .innerJoin(interpreters, eq(interpreters.id, songInterpreters.interpreterId))
    .orderBy(sql`sort_key(${interpreters.name})`)
    .all()

  const namesBySong = new Map<number, string[]>()
  for (const link of links) {
    const names = namesBySong.get(link.songId) ?? []
    names.push(link.name)
    namesBySong.set(link.songId, names)
  }

  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    categories: db.select({ name: categories.name }).from(categories).orderBy(sql`sort_key(${categories.name})`).all().map((c) => c.name),
    interpreters: db.select({ name: interpreters.name }).from(interpreters).orderBy(sql`sort_key(${interpreters.name})`).all().map((i) => i.name),
    songs: rows.map(({ id, ...song }) => ({ ...song, interpreters: namesBySong.get(id) ?? [] }))
  }
}

function duplicateKey(title: string, interpreterNames: string[]): string {
  const names = interpreterNames
    .map(normalizeName)
    .filter((n) => n !== '')
    .sort()
  return `${normalizeName(title)}\u0000${[...new Set(names)].join('\u0001')}`
}

function toInput(song: ExportedSong): SongInput {
  return {
    title: song.title,
    key: song.key,
    originalKey: song.originalKey,
    firstLine: song.firstLine,
    capo: song.capo,
    songText: song.songText,
    chords: song.chords,
    categoryId: null,
    newCategoryName: song.category,
    interpreterIds: [],
    newInterpreterNames: song.interpreters
  }
}

function count(db: Pick<AppDb, 'select'>, table: typeof categories | typeof interpreters): number {
  return db.select({ n: sql<number>`count(*)` }).from(table).get()?.n ?? 0
}

/** Adds the songs to the open file in one transaction; songs already present (same title and interpreters) are skipped. */
export function importSongs(
  db: AppDb,
  data: { songs: ExportedSong[]; categories: string[]; interpreters: string[] }
): ImportResult {
  const known = new Set(exportSongs(db).songs.map((s) => duplicateKey(s.title, s.interpreters)))

  return db.transaction((tx) => {
    const categoriesBefore = count(tx, categories)
    const interpretersBefore = count(tx, interpreters)

    for (const name of data.categories) if (name.trim()) getOrCreateCategory(tx, name)
    for (const name of data.interpreters) if (name.trim()) getOrCreateInterpreter(tx, name)

    let imported = 0
    let skipped = 0
    for (const song of data.songs) {
      const key = duplicateKey(song.title, song.interpreters)
      if (known.has(key)) {
        skipped++
        continue
      }
      known.add(key)
      insertSong(tx, toInput(song))
      imported++
    }

    return {
      imported,
      skipped,
      categoriesAdded: count(tx, categories) - categoriesBefore,
      interpretersAdded: count(tx, interpreters) - interpretersBefore
    }
  })
}
