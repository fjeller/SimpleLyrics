import { asc, eq, sql } from 'drizzle-orm'
import { normalizeName, type AppDb } from '../db/connection'
import { categories, interpreters, setlistItems, setlists, songInterpreters, songs } from '../db/schema'
import { getOrCreateCategory } from './categories'
import { getOrCreateInterpreter } from './interpreters'
import { insertSetlist } from './setlists'
import { insertSong } from './songs'
import { EXPORT_FORMAT, EXPORT_VERSION } from '../../shared/types'
import type { ExportedSetlist, ExportedSong, ImportResult, SetlistItemInput, SongExport, SongInput } from '../../shared/types'

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
  const titleBySong = new Map(rows.map((row) => [row.id, row.title]))

  const items = db
    .select({ setlistId: setlistItems.setlistId, kind: setlistItems.kind, songId: setlistItems.songId })
    .from(setlistItems)
    .orderBy(asc(setlistItems.setlistId), asc(setlistItems.position))
    .all()
  const exportedSetlists: ExportedSetlist[] = db
    .select({ id: setlists.id, name: setlists.name })
    .from(setlists)
    .orderBy(sql`sort_key(${setlists.name})`, asc(setlists.id))
    .all()
    .map((list) => ({
      name: list.name,
      items: items
        .filter((item) => item.setlistId === list.id)
        .map((item) =>
          item.kind === 'song' && item.songId !== null
            ? { kind: 'song' as const, title: titleBySong.get(item.songId) ?? '', interpreters: namesBySong.get(item.songId) ?? [] }
            : { kind: 'break' as const }
        )
    }))

  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    categories: db.select({ name: categories.name }).from(categories).orderBy(sql`sort_key(${categories.name})`).all().map((c) => c.name),
    interpreters: db.select({ name: interpreters.name }).from(interpreters).orderBy(sql`sort_key(${interpreters.name})`).all().map((i) => i.name),
    songs: rows.map(({ id, ...song }) => ({ ...song, interpreters: namesBySong.get(id) ?? [] })),
    setlists: exportedSetlists
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

/** Maps the duplicate key (title + interpreters) of every song in the file to its id; the oldest song wins. */
function songIdsByKey(db: Pick<AppDb, 'select'>): Map<string, number> {
  const rows = db.select({ id: songs.id, title: songs.title }).from(songs).orderBy(asc(songs.id)).all()
  const links = db
    .select({ songId: songInterpreters.songId, name: interpreters.name })
    .from(songInterpreters)
    .innerJoin(interpreters, eq(interpreters.id, songInterpreters.interpreterId))
    .all()
  const names = new Map<number, string[]>()
  for (const link of links) names.set(link.songId, [...(names.get(link.songId) ?? []), link.name])

  const result = new Map<string, number>()
  for (const row of rows) {
    const key = duplicateKey(row.title, names.get(row.id) ?? [])
    if (!result.has(key)) result.set(key, row.id)
  }
  return result
}

/** Adds the songs to the open file in one transaction; songs already present (same title and interpreters) are skipped. */
export function importSongs(
  db: AppDb,
  data: { songs: ExportedSong[]; categories: string[]; interpreters: string[]; setlists?: ExportedSetlist[] }
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

    // Setlist entries point to songs by title and interpreters, so they resolve to new and existing songs alike.
    const songIds = songIdsByKey(tx)
    let setlistsImported = 0
    let setlistsRenamed = 0
    const missingSetlistSongs: ImportResult['missingSetlistSongs'] = []
    for (const setlist of data.setlists ?? []) {
      let missing = 0
      const items = setlist.items.flatMap((item): SetlistItemInput[] => {
        if (item.kind === 'break') return [{ kind: 'break' }]
        const songId = songIds.get(duplicateKey(item.title, item.interpreters))
        if (songId === undefined) {
          missing++
          return []
        }
        return [{ kind: 'song', songId }]
      })
      const { name } = insertSetlist(tx, setlist.name, items)
      setlistsImported++
      if (name !== setlist.name.trim()) setlistsRenamed++
      if (missing > 0) missingSetlistSongs.push({ setlist: name, count: missing })
    }

    return {
      imported,
      skipped,
      categoriesAdded: count(tx, categories) - categoriesBefore,
      interpretersAdded: count(tx, interpreters) - interpretersBefore,
      setlistsImported,
      setlistsRenamed,
      missingSetlistSongs
    }
  })
}
