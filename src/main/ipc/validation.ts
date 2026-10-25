import { z } from 'zod'
import { EXPORT_FORMAT, EXPORT_VERSION, LIMITS } from '../../shared/types'
import type { ExportedSong } from '../../shared/types'
import { UserError } from '../errors'

const id = z.number().int().positive()

const name = z
  .string()
  .transform((v) => v.trim())
  .pipe(z.string().min(1, 'The name must not be empty.').max(LIMITS.name, `The name must not exceed ${LIMITS.name} characters.`))

/** Empty / whitespace-only input becomes null. */
function optionalText(max: number, label: string, trim: boolean) {
  return z
    .string()
    .max(max, `${label} must not exceed ${max} characters.`)
    .nullable()
    .transform((v) => {
      if (v === null) return null
      const value = trim ? v.trim() : v
      return value.trim() === '' ? null : value
    })
}

export const idSchema = id
export const nameSchema = name

export const themeSchema = z.enum(['dark', 'light'])

export const songFilterSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('all') }),
  z.object({ kind: z.literal('category'), id: id.nullable() }),
  z.object({ kind: z.literal('interpreter'), id: id.nullable() }),
  z.object({ kind: z.literal('search'), term: z.string().max(LIMITS.title * 2) })
])

export const songSortSchema = z.object({
  column: z.enum(['title', 'interpreters', 'category']),
  direction: z.enum(['asc', 'desc'])
})

export const songInputSchema = z.object({
  title: z
    .string()
    .transform((v) => v.trim())
    .pipe(z.string().min(1, 'The title is required.').max(LIMITS.title, `The title must not exceed ${LIMITS.title} characters.`)),
  key: optionalText(LIMITS.key, 'The key', true),
  originalKey: optionalText(LIMITS.key, 'The original key', true),
  firstLine: optionalText(LIMITS.firstLine, 'The first line', true),
  capo: z.number().int().min(0, 'Capo must be between 0 and 12.').max(LIMITS.capoMax, 'Capo must be between 0 and 12.'),
  songText: z.string().nullable().transform((v) => (v === null || v.trim() === '' ? null : v)),
  chords: optionalText(LIMITS.chords, 'The chords field', false),
  categoryId: id.nullable(),
  newCategoryName: z
    .string()
    .nullable()
    .transform((v) => (v === null || v.trim() === '' ? null : v.trim()))
    .pipe(z.string().max(LIMITS.name, `The category name must not exceed ${LIMITS.name} characters.`).nullable()),
  interpreterIds: z.array(id).max(200),
  newInterpreterNames: z
    .array(z.string().transform((v) => v.trim()).pipe(z.string().max(LIMITS.name, `An interpreter name must not exceed ${LIMITS.name} characters.`)))
    .max(200)
})

export function formatValidationError(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'The input is invalid.'
}

const orNull = (v: unknown): unknown => v ?? null

const exportedSongSchema = z.object({
  title: songInputSchema.shape.title,
  key: z.preprocess(orNull, songInputSchema.shape.key),
  originalKey: z.preprocess(orNull, songInputSchema.shape.originalKey),
  firstLine: z.preprocess(orNull, songInputSchema.shape.firstLine),
  capo: z.preprocess((v) => v ?? 0, songInputSchema.shape.capo),
  songText: z.preprocess(orNull, songInputSchema.shape.songText),
  chords: z.preprocess(orNull, songInputSchema.shape.chords),
  category: z.preprocess(orNull, songInputSchema.shape.newCategoryName),
  interpreters: z.preprocess((v) => v ?? [], songInputSchema.shape.newInterpreterNames)
})

const nameList = (label: string) =>
  z.preprocess(
    (v) => v ?? [],
    z.array(z.string().transform((v) => v.trim()).pipe(z.string().max(LIMITS.name, `A ${label} name must not exceed ${LIMITS.name} characters.`))).max(100_000)
  )

const exportFileSchema = z.object({
  format: z.literal(EXPORT_FORMAT, 'This is not a SimpleLyrics song export.'),
  version: z.literal(EXPORT_VERSION, 'This export was created by an unsupported version.'),
  songs: z.array(z.unknown(), 'The file contains no song list.').max(100_000),
  categories: nameList('category'),
  interpreters: nameList('interpreter')
})

export interface ParsedSongExport {
  songs: ExportedSong[]
  categories: string[]
  interpreters: string[]
  /** Songs that failed validation, e.g. "Song 2 (Title): Capo must be between 0 and 12." */
  invalid: string[]
}

/** Parses a song export; file-level problems throw a UserError, invalid songs are collected and left out. */
export function parseSongExport(text: string): ParsedSongExport {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    throw new UserError('The file is not valid JSON.')
  }
  const file = exportFileSchema.safeParse(json)
  if (!file.success) throw new UserError(formatValidationError(file.error))

  const songs: ExportedSong[] = []
  const invalid: string[] = []
  file.data.songs.forEach((raw, index) => {
    const song = exportedSongSchema.safeParse(raw)
    if (song.success) {
      songs.push(song.data as ExportedSong)
      return
    }
    const rawTitle = typeof (raw as { title?: unknown } | null)?.title === 'string' ? (raw as { title: string }).title.trim().slice(0, 60) : ''
    invalid.push(`Song ${index + 1}${rawTitle ? ` (${rawTitle})` : ''}: ${formatValidationError(song.error)}`)
  })
  return { songs, invalid, categories: file.data.categories as string[], interpreters: file.data.interpreters as string[] }
}
