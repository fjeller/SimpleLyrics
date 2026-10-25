import { and, asc, eq, inArray, sql } from 'drizzle-orm'
import { normalizeName, type AppDb } from '../db/connection'
import { setlistItems, setlists, songs } from '../db/schema'
import { UserError } from '../errors'
import { LIMITS } from '../../shared/types'
import type { SetlistDetail, SetlistItem, SetlistItemInput, SetlistPrintData, SetlistSummary, SongDetail } from '../../shared/types'
import { normalizeSetlistItems, splitIntoSets } from '../../shared/setlists'
import { getSong, interpreterNames } from './songs'

type Executor = Pick<AppDb, 'select' | 'insert'>

function findSetlistByName(db: Executor, name: string): { id: number; name: string } | undefined {
  const wanted = normalizeName(name)
  return db
    .select({ id: setlists.id, name: setlists.name })
    .from(setlists)
    .all()
    .find((s) => normalizeName(s.name) === wanted)
}

function requireName(rawName: string): string {
  const name = rawName.trim()
  if (!name) throw new UserError('The setlist name must not be empty.')
  return name
}

function assertNameFree(db: Executor, name: string, ownId?: number): void {
  const existing = findSetlistByName(db, name)
  if (existing && existing.id !== ownId) throw new UserError('A setlist with this name already exists.')
}

/** The name itself if free, otherwise "Name (2)", "Name (3)", … */
export function uniqueSetlistName(db: Executor, rawName: string): string {
  const name = rawName.trim()
  if (!findSetlistByName(db, name)) return name
  for (let n = 2; ; n++) {
    const suffix = ` (${n})`
    const candidate = name.slice(0, LIMITS.name - suffix.length) + suffix
    if (!findSetlistByName(db, candidate)) return candidate
  }
}

function insertItems(tx: Executor, setlistId: number, items: SetlistItemInput[]): void {
  const normalized = normalizeSetlistItems(items)
  if (normalized.length === 0) return
  tx.insert(setlistItems)
    .values(normalized.map((item, position) => ({ setlistId, position, kind: item.kind, songId: item.kind === 'song' ? item.songId : null })))
    .run()
}

function assertSongsExist(tx: Executor, items: SetlistItemInput[]): void {
  const ids = [...new Set(items.flatMap((item) => (item.kind === 'song' ? [item.songId] : [])))]
  if (ids.length === 0) return
  const found = tx.select({ id: songs.id }).from(songs).where(inArray(songs.id, ids)).all().length
  if (found !== ids.length) throw new UserError('A song of the setlist no longer exists. Reload the setlist and try again.')
}

function readItems(db: Pick<AppDb, 'select'>, setlistId: number): SetlistItem[] {
  return db
    .select({ kind: setlistItems.kind, songId: setlistItems.songId, title: songs.title, interpreters: interpreterNames })
    .from(setlistItems)
    .leftJoin(songs, eq(songs.id, setlistItems.songId))
    .where(eq(setlistItems.setlistId, setlistId))
    .orderBy(asc(setlistItems.position))
    .all()
    .map((row): SetlistItem =>
      row.kind === 'song' && row.songId !== null ? { kind: 'song', songId: row.songId, title: row.title ?? '', interpreters: row.interpreters ?? '' } : { kind: 'break' }
    )
}

export function listSetlists(db: AppDb): SetlistSummary[] {
  const lists = db.select({ id: setlists.id, name: setlists.name }).from(setlists).orderBy(sql`sort_key(${setlists.name})`, asc(setlists.id)).all()
  const items = db
    .select({ setlistId: setlistItems.setlistId, kind: setlistItems.kind })
    .from(setlistItems)
    .orderBy(asc(setlistItems.setlistId), asc(setlistItems.position))
    .all()
  return lists.map((list) => {
    const own = items.filter((i) => i.setlistId === list.id)
    return { ...list, songCount: own.filter((i) => i.kind === 'song').length, setCount: splitIntoSets(own).length }
  })
}

export function getSetlist(db: AppDb, id: number): SetlistDetail | null {
  const list = db.select({ id: setlists.id, name: setlists.name }).from(setlists).where(eq(setlists.id, id)).get()
  return list ? { ...list, items: readItems(db, id) } : null
}

export function getSetlistForPrint(db: AppDb, id: number): SetlistPrintData | null {
  const list = getSetlist(db, id)
  if (!list) return null
  const cache = new Map<number, SongDetail | null>()
  const load = (songId: number): SongDetail | null => {
    if (!cache.has(songId)) cache.set(songId, getSong(db, songId))
    return cache.get(songId) ?? null
  }
  const sets = splitIntoSets(list.items)
    .map((set) => set.map((item) => load(item.songId)).filter((song): song is SongDetail => song !== null))
    .filter((set) => set.length > 0)
  return { id: list.id, name: list.name, sets }
}

export function createSetlist(db: AppDb, rawName: string): number {
  const name = requireName(rawName)
  assertNameFree(db, name)
  return db.insert(setlists).values({ name }).returning({ id: setlists.id }).get().id
}

/** Inserts a setlist under a free name; call inside a transaction. Returns the id and the name used. */
export function insertSetlist(tx: Executor, rawName: string, items: SetlistItemInput[]): { id: number; name: string } {
  const name = uniqueSetlistName(tx, requireName(rawName))
  const { id } = tx.insert(setlists).values({ name }).returning({ id: setlists.id }).get()
  insertItems(tx, id, items)
  return { id, name }
}

export function renameSetlist(db: AppDb, id: number, rawName: string): void {
  const name = requireName(rawName)
  assertNameFree(db, name, id)
  const result = db.update(setlists).set({ name, updatedAt: sql`CURRENT_TIMESTAMP` }).where(eq(setlists.id, id)).run()
  if (result.changes === 0) throw new UserError('The setlist no longer exists.')
}

export function duplicateSetlist(db: AppDb, id: number, rawName: string): number {
  const name = requireName(rawName)
  return db.transaction((tx) => {
    assertNameFree(tx, name)
    const source = getSetlist(db, id)
    if (!source) throw new UserError('The setlist no longer exists.')
    const { id: copyId } = tx.insert(setlists).values({ name }).returning({ id: setlists.id }).get()
    insertItems(
      tx,
      copyId,
      source.items.map((item): SetlistItemInput => (item.kind === 'song' ? { kind: 'song', songId: item.songId } : { kind: 'break' }))
    )
    return copyId
  })
}

export function deleteSetlist(db: AppDb, id: number): void {
  db.delete(setlists).where(eq(setlists.id, id)).run()
}

export function saveSetlist(db: AppDb, id: number, rawName: string, items: SetlistItemInput[]): void {
  const name = requireName(rawName)
  db.transaction((tx) => {
    assertNameFree(tx, name, id)
    const result = tx.update(setlists).set({ name, updatedAt: sql`CURRENT_TIMESTAMP` }).where(eq(setlists.id, id)).run()
    if (result.changes === 0) throw new UserError('The setlist no longer exists.')
    assertSongsExist(tx, items)
    tx.delete(setlistItems).where(eq(setlistItems.setlistId, id)).run()
    insertItems(tx, id, items)
  })
}

export function setlistUsage(db: AppDb, songId: number): number {
  return (
    db
      .select({ n: sql<number>`count(distinct ${setlistItems.setlistId})` })
      .from(setlistItems)
      .where(and(eq(setlistItems.kind, 'song'), eq(setlistItems.songId, songId)))
      .get()?.n ?? 0
  )
}
