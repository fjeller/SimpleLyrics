import { eq, sql, type SQL } from 'drizzle-orm'
import type { AppDb } from '../db/connection'
import { categories, interpreters, songInterpreters, songs } from '../db/schema'
import { UserError } from '../errors'
import { getOrCreateCategory } from './categories'
import { getOrCreateInterpreter } from './interpreters'
import type { SongDetail, SongFilter, SongInput, SongListItem, SongSort } from '../../shared/types'
import { DEFAULT_SONG_SORT } from '../../shared/types'

function filterCondition(filter: SongFilter): SQL | undefined {
  switch (filter.kind) {
    case 'all':
      return undefined
    case 'category':
      return filter.id === null ? sql`${songs.categoryId} is null` : eq(songs.categoryId, filter.id)
    case 'interpreter':
      return filter.id === null
        ? sql`not exists (select 1 from ${songInterpreters} where ${songInterpreters.songId} = ${songs.id})`
        : sql`exists (select 1 from ${songInterpreters} where ${songInterpreters.songId} = ${songs.id} and ${songInterpreters.interpreterId} = ${filter.id})`
    case 'search': {
      const term = filter.term.trim()
      return sql`(unicode_contains(${songs.title}, ${term}) or unicode_contains(${songs.firstLine}, ${term}))`
    }
  }
}

const interpreterNames = sql<string | null>`(
  select group_concat(name, ', ') from (
    select ${interpreters.name} as name
    from ${songInterpreters}
    join ${interpreters} on ${interpreters.id} = ${songInterpreters.interpreterId}
    where ${songInterpreters.songId} = ${songs.id}
    order by sort_key(${interpreters.name})
  )
)`

/** The chosen column first, then title and id so the order is stable. NULLs (no category / interpreter) sort first ascending, last descending. */
function orderClauses(sort: SongSort): SQL[] {
  const direction = sql.raw(sort.direction === 'desc' ? 'desc' : 'asc')
  const byTitle = sql`sort_key(${songs.title})`
  switch (sort.column) {
    case 'title':
      return [sql`${byTitle} ${direction}`, sql`${songs.id} asc`]
    case 'interpreters':
      return [sql`sort_key(${interpreterNames}) ${direction}`, sql`${byTitle} asc`, sql`${songs.id} asc`]
    case 'category':
      return [sql`sort_key(${categories.name}) ${direction}`, sql`${byTitle} asc`, sql`${songs.id} asc`]
  }
}

export function listSongs(db: AppDb, filter: SongFilter, sort: SongSort = DEFAULT_SONG_SORT): SongListItem[] {
  return db
    .select({
      id: songs.id,
      title: songs.title,
      category: categories.name,
      capo: songs.capo,
      firstLine: songs.firstLine,
      interpreters: interpreterNames
    })
    .from(songs)
    .leftJoin(categories, eq(songs.categoryId, categories.id))
    .where(filterCondition(filter))
    .orderBy(...orderClauses(sort))
    .all()
    .map((row) => ({ ...row, interpreters: row.interpreters ?? '' }))
}

export function getSong(db: AppDb, id: number): SongDetail | null {
  const song = db.select().from(songs).where(eq(songs.id, id)).get()
  if (!song) return null
  const linked = db
    .select({ id: interpreters.id, name: interpreters.name })
    .from(songInterpreters)
    .innerJoin(interpreters, eq(interpreters.id, songInterpreters.interpreterId))
    .where(eq(songInterpreters.songId, id))
    .orderBy(sql`sort_key(${interpreters.name})`)
    .all()
  return {
    id: song.id,
    title: song.title,
    key: song.key,
    originalKey: song.originalKey,
    firstLine: song.firstLine,
    categoryId: song.categoryId,
    capo: song.capo,
    songText: song.songText,
    chords: song.chords,
    interpreters: linked
  }
}

function resolveCategoryId(tx: Pick<AppDb, 'select' | 'insert'>, input: SongInput): number | null {
  if (input.newCategoryName && input.newCategoryName.trim()) return getOrCreateCategory(tx, input.newCategoryName)
  return input.categoryId
}

function resolveInterpreterIds(tx: Pick<AppDb, 'select' | 'insert'>, input: SongInput): number[] {
  const ids = new Set(input.interpreterIds)
  for (const name of input.newInterpreterNames) {
    if (name.trim()) ids.add(getOrCreateInterpreter(tx, name))
  }
  return [...ids]
}

function songColumns(input: SongInput, categoryId: number | null) {
  return {
    title: input.title,
    key: input.key,
    originalKey: input.originalKey,
    firstLine: input.firstLine,
    categoryId,
    capo: input.capo,
    songText: input.songText,
    chords: input.chords
  }
}

/** Inserts the song plus any missing category/interpreters; call inside a transaction. */
export function insertSong(tx: Pick<AppDb, 'select' | 'insert'>, input: SongInput): number {
  const categoryId = resolveCategoryId(tx, input)
  const interpreterIds = resolveInterpreterIds(tx, input)
  const { id } = tx.insert(songs).values(songColumns(input, categoryId)).returning({ id: songs.id }).get()
  if (interpreterIds.length > 0) {
    tx.insert(songInterpreters)
      .values(interpreterIds.map((interpreterId) => ({ songId: id, interpreterId })))
      .run()
  }
  return id
}

export function createSong(db: AppDb, input: SongInput): number {
  return db.transaction((tx) => insertSong(tx, input))
}

export function updateSong(db: AppDb, id: number, input: SongInput): void {
  db.transaction((tx) => {
    const categoryId = resolveCategoryId(tx, input)
    const interpreterIds = resolveInterpreterIds(tx, input)
    const result = tx
      .update(songs)
      .set({ ...songColumns(input, categoryId), updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(songs.id, id))
      .run()
    if (result.changes === 0) throw new UserError('The song no longer exists.')
    tx.delete(songInterpreters).where(eq(songInterpreters.songId, id)).run()
    if (interpreterIds.length > 0) {
      tx.insert(songInterpreters)
        .values(interpreterIds.map((interpreterId) => ({ songId: id, interpreterId })))
        .run()
    }
  })
}

export function deleteSong(db: AppDb, id: number): void {
  db.delete(songs).where(eq(songs.id, id)).run()
}
