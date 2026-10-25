import { sql } from 'drizzle-orm'
import { check, index, integer, primaryKey, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { LIMITS } from '../../shared/types'

export const appMeta = sqliteTable('app_meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull()
})

export const categories = sqliteTable(
  'categories',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull()
  },
  (t) => [uniqueIndex('categories_name_nocase').on(sql`${t.name} COLLATE NOCASE`)]
)

export const interpreters = sqliteTable(
  'interpreters',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull()
  },
  (t) => [uniqueIndex('interpreters_name_nocase').on(sql`${t.name} COLLATE NOCASE`)]
)

export const songs = sqliteTable(
  'songs',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    title: text('title').notNull(),
    key: text('key'),
    originalKey: text('original_key'),
    firstLine: text('first_line'),
    categoryId: integer('category_id').references(() => categories.id, { onDelete: 'set null' }),
    capo: integer('capo').notNull().default(0),
    songText: text('song_text'),
    chords: text('chords'),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`)
  },
  (t) => [
    index('songs_category_idx').on(t.categoryId),
    index('songs_title_idx').on(t.title),
    check('songs_capo_range', sql`${t.capo} BETWEEN 0 AND 12`),
    check('songs_key_len', sql`length(${t.key}) <= ${sql.raw(String(LIMITS.key))}`),
    check('songs_original_key_len', sql`length(${t.originalKey}) <= ${sql.raw(String(LIMITS.key))}`),
    check('songs_first_line_len', sql`length(${t.firstLine}) <= ${sql.raw(String(LIMITS.firstLine))}`),
    check('songs_chords_len', sql`length(${t.chords}) <= ${sql.raw(String(LIMITS.chords))}`)
  ]
)

export const songInterpreters = sqliteTable(
  'song_interpreters',
  {
    songId: integer('song_id')
      .notNull()
      .references(() => songs.id, { onDelete: 'cascade' }),
    interpreterId: integer('interpreter_id')
      .notNull()
      .references(() => interpreters.id, { onDelete: 'cascade' })
  },
  (t) => [primaryKey({ columns: [t.songId, t.interpreterId] }), index('song_interpreters_interpreter_idx').on(t.interpreterId)]
)

export const setlists = sqliteTable(
  'setlists',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`)
  },
  (t) => [uniqueIndex('setlists_name_nocase').on(sql`${t.name} COLLATE NOCASE`)]
)

/** Songs and breaks of a setlist in order; sets are derived from the breaks. */
export const setlistItems = sqliteTable(
  'setlist_items',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    setlistId: integer('setlist_id')
      .notNull()
      .references(() => setlists.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    kind: text('kind', { enum: ['song', 'break'] }).notNull(),
    songId: integer('song_id').references(() => songs.id, { onDelete: 'cascade' })
  },
  (t) => [
    uniqueIndex('setlist_items_position_idx').on(t.setlistId, t.position),
    index('setlist_items_song_idx').on(t.songId),
    check('setlist_items_kind', sql`(${t.kind} = 'song' and ${t.songId} is not null) or (${t.kind} = 'break' and ${t.songId} is null)`)
  ]
)
