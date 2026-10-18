import { asc, eq, sql } from 'drizzle-orm'
import { normalizeName, type AppDb } from '../db/connection'
import { categories, songs } from '../db/schema'
import { UserError } from '../errors'
import type { CategoryList } from '../../shared/types'

type Executor = Pick<AppDb, 'select' | 'insert'>

export function findCategoryByName(db: Executor, name: string): { id: number; name: string } | undefined {
  const wanted = normalizeName(name)
  return db
    .select()
    .from(categories)
    .all()
    .find((c) => normalizeName(c.name) === wanted)
}

/** Returns the id of the category with this name, creating it when missing. */
export function getOrCreateCategory(db: Executor, rawName: string): number {
  const name = rawName.trim()
  if (!name) throw new UserError('The category name must not be empty.')
  const existing = findCategoryByName(db, name)
  if (existing) return existing.id
  return db.insert(categories).values({ name }).returning({ id: categories.id }).get().id
}

export function listCategories(db: AppDb): CategoryList {
  const items = db
    .select({
      id: categories.id,
      name: categories.name,
      songCount: sql<number>`count(${songs.id})`
    })
    .from(categories)
    .leftJoin(songs, eq(songs.categoryId, categories.id))
    .groupBy(categories.id)
    .orderBy(sql`sort_key(${categories.name})`, asc(categories.id))
    .all()

  const totals = db
    .select({
      total: sql<number>`count(*)`,
      uncategorized: sql<number>`coalesce(sum(case when ${songs.categoryId} is null then 1 else 0 end), 0)`
    })
    .from(songs)
    .get()

  return { items, totalSongs: totals?.total ?? 0, uncategorizedSongs: totals?.uncategorized ?? 0 }
}

export function createCategory(db: AppDb, rawName: string): number {
  const name = rawName.trim()
  if (!name) throw new UserError('The category name must not be empty.')
  if (findCategoryByName(db, name)) throw new UserError('A category with this name already exists.')
  return db.insert(categories).values({ name }).returning({ id: categories.id }).get().id
}

export function renameCategory(db: AppDb, id: number, rawName: string): void {
  const name = rawName.trim()
  if (!name) throw new UserError('The category name must not be empty.')
  const duplicate = findCategoryByName(db, name)
  if (duplicate && duplicate.id !== id) throw new UserError('A category with this name already exists.')
  const result = db.update(categories).set({ name }).where(eq(categories.id, id)).run()
  if (result.changes === 0) throw new UserError('The category no longer exists.')
}

/** Songs of the category keep existing and fall back to "no category" (ON DELETE SET NULL). */
export function deleteCategory(db: AppDb, id: number): void {
  db.delete(categories).where(eq(categories.id, id)).run()
}
