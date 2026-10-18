import { eq, sql } from 'drizzle-orm'
import { normalizeName, type AppDb } from '../db/connection'
import { interpreters, songInterpreters, songs } from '../db/schema'
import { UserError } from '../errors'
import type { InterpreterList } from '../../shared/types'

type Executor = Pick<AppDb, 'select' | 'insert'>

export function findInterpreterByName(db: Executor, name: string): { id: number; name: string } | undefined {
  const wanted = normalizeName(name)
  return db
    .select()
    .from(interpreters)
    .all()
    .find((i) => normalizeName(i.name) === wanted)
}

/** Returns the id of the interpreter with this name, creating it when missing. */
export function getOrCreateInterpreter(db: Executor, rawName: string): number {
  const name = rawName.trim()
  if (!name) throw new UserError('The interpreter name must not be empty.')
  const existing = findInterpreterByName(db, name)
  if (existing) return existing.id
  return db.insert(interpreters).values({ name }).returning({ id: interpreters.id }).get().id
}

export function listInterpreters(db: AppDb): InterpreterList {
  const items = db
    .select({
      id: interpreters.id,
      name: interpreters.name,
      songCount: sql<number>`count(${songInterpreters.songId})`
    })
    .from(interpreters)
    .leftJoin(songInterpreters, eq(songInterpreters.interpreterId, interpreters.id))
    .groupBy(interpreters.id)
    .orderBy(sql`sort_key(${interpreters.name})`, interpreters.id)
    .all()

  const total = db.select({ total: sql<number>`count(*)` }).from(songs).get()?.total ?? 0
  const without =
    db
      .select({ n: sql<number>`count(*)` })
      .from(songs)
      .where(sql`not exists (select 1 from ${songInterpreters} where ${songInterpreters.songId} = ${songs.id})`)
      .get()?.n ?? 0

  return { items, totalSongs: total, withoutInterpreterSongs: without }
}

export function createInterpreter(db: AppDb, rawName: string): number {
  const name = rawName.trim()
  if (!name) throw new UserError('The interpreter name must not be empty.')
  if (findInterpreterByName(db, name)) throw new UserError('An interpreter with this name already exists.')
  return db.insert(interpreters).values({ name }).returning({ id: interpreters.id }).get().id
}

export function renameInterpreter(db: AppDb, id: number, rawName: string): void {
  const name = rawName.trim()
  if (!name) throw new UserError('The interpreter name must not be empty.')
  const duplicate = findInterpreterByName(db, name)
  if (duplicate && duplicate.id !== id) throw new UserError('An interpreter with this name already exists.')
  const result = db.update(interpreters).set({ name }).where(eq(interpreters.id, id)).run()
  if (result.changes === 0) throw new UserError('The interpreter no longer exists.')
}

/** Only the relations are removed (ON DELETE CASCADE on the junction table); songs stay. */
export function deleteInterpreter(db: AppDb, id: number): void {
  db.delete(interpreters).where(eq(interpreters.id, id)).run()
}
