import { existsSync, rmSync } from 'node:fs'
import Database from 'better-sqlite3'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import * as schema from './schema'

export type AppDb = BetterSQLite3Database<typeof schema>

export interface DbHandle {
  sqlite: Database.Database
  db: AppDb
  path: string
}

export const SCHEMA_OWNER = 'SimpleLyrics'

export class InvalidDatabaseFileError extends Error {}

export function normalizeName(value: string): string {
  return value.trim().toLocaleLowerCase()
}

function sortKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase()
}

function configure(sqlite: Database.Database): void {
  sqlite.pragma('foreign_keys = ON')
  // SQLite's built-in NOCASE/LIKE only handle ASCII, so provide Unicode-aware replacements.
  sqlite.function('sort_key', { deterministic: true }, (value) => (typeof value === 'string' ? sortKey(value) : null))
  sqlite.function('unicode_contains', { deterministic: true }, (haystack, needle) => {
    if (typeof haystack !== 'string' || typeof needle !== 'string') return 0
    return normalizeName(haystack).includes(normalizeName(needle)) ? 1 : 0
  })
}

export function removeDatabaseFiles(path: string): void {
  for (const suffix of ['', '-wal', '-shm', '-journal']) {
    rmSync(path + suffix, { force: true })
  }
}

function assertOwnedBySimpleLyrics(sqlite: Database.Database): void {
  const table = sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'app_meta'").get()
  const row = table
    ? (sqlite.prepare('SELECT value FROM app_meta WHERE key = ?').get('schema_owner') as { value: string } | undefined)
    : undefined
  if (row?.value !== SCHEMA_OWNER) {
    throw new InvalidDatabaseFileError('This is not a SimpleLyrics file.')
  }
}

/** Opens (or creates, replacing any existing file) a song database and brings its schema up to date. */
export function openDatabase(path: string, migrationsFolder: string, mode: 'open' | 'create'): DbHandle {
  if (mode === 'create') {
    removeDatabaseFiles(path)
  } else if (!existsSync(path)) {
    throw new InvalidDatabaseFileError('The file does not exist.')
  }

  let sqlite: Database.Database | undefined
  try {
    sqlite = new Database(path)
    configure(sqlite)
    if (mode === 'open') {
      try {
        assertOwnedBySimpleLyrics(sqlite)
      } catch (e) {
        if (e instanceof InvalidDatabaseFileError) throw e
        throw new InvalidDatabaseFileError('This is not a SimpleLyrics file.')
      }
    }
    const db = drizzle(sqlite, { schema })
    migrate(db, { migrationsFolder })
    if (mode === 'create') {
      db.insert(schema.appMeta).values({ key: 'schema_owner', value: SCHEMA_OWNER }).run()
    }
    return { sqlite, db, path }
  } catch (e) {
    sqlite?.close()
    if (mode === 'create') removeDatabaseFiles(path)
    throw e
  }
}

export function closeDatabase(handle: DbHandle): void {
  handle.sqlite.close()
}
