import { readFile, stat, writeFile } from 'node:fs/promises'
import { basename, extname } from 'node:path'
import { dialog, type BrowserWindow } from 'electron'
import { UserError } from './errors'
import { getHandle } from './files'
import { parseSongExport } from './ipc/validation'
import { exportSongs, importSongs } from './repositories/transfer'

const MAX_IMPORT_BYTES = 100 * 1024 * 1024
const MAX_LISTED_ERRORS = 10

const jsonFilters = [{ name: 'JSON', extensions: ['json'] }]

function messageBox(parent: BrowserWindow | null, message: string, detail?: string, type: 'info' | 'warning' = 'info'): Promise<unknown> {
  const options = { type, title: 'SimpleLyrics', message, detail }
  return parent ? dialog.showMessageBox(parent, options) : dialog.showMessageBox(options)
}

/** Writes all songs of the open file to a JSON file chosen by the user. Does nothing when cancelled. */
export async function exportSongsToFile(parent: BrowserWindow | null): Promise<void> {
  const handle = getHandle()
  const base = basename(handle.path, extname(handle.path))
  const options = { title: 'Export songs', defaultPath: `${base}.json`, filters: jsonFilters }
  const result = parent ? await dialog.showSaveDialog(parent, options) : await dialog.showSaveDialog(options)
  if (result.canceled || !result.filePath) return

  const data = exportSongs(handle.db)
  await writeFile(result.filePath, JSON.stringify(data, null, 2), 'utf8')
  const setlistCount = data.setlists?.length ?? 0
  const setlistText = setlistCount > 0 ? ` and ${setlistCount} ${setlistCount === 1 ? 'setlist' : 'setlists'}` : ''
  await messageBox(parent, `Exported ${data.songs.length} ${data.songs.length === 1 ? 'song' : 'songs'}${setlistText}.`, result.filePath)
}

/** Adds the songs of a JSON export to the open file. Does nothing when cancelled. */
export async function importSongsFromFile(parent: BrowserWindow | null): Promise<void> {
  const handle = getHandle()
  const options = { title: 'Import songs', filters: jsonFilters, properties: ['openFile' as const] }
  const result = parent ? await dialog.showOpenDialog(parent, options) : await dialog.showOpenDialog(options)
  if (result.canceled || result.filePaths.length === 0) return

  const path = result.filePaths[0]
  if ((await stat(path)).size > MAX_IMPORT_BYTES) throw new UserError('The file is too large to import.')
  const parsed = parseSongExport(await readFile(path, 'utf8'))
  const summary = importSongs(handle.db, parsed)

  parent?.webContents.send('data:changed')
  const lines = [`Imported: ${summary.imported}`, `Skipped (already present): ${summary.skipped}`]
  if (summary.categoriesAdded > 0) lines.push(`New categories: ${summary.categoriesAdded}`)
  if (summary.interpretersAdded > 0) lines.push(`New interpreters: ${summary.interpretersAdded}`)
  if (summary.setlistsImported > 0) lines.push(`Setlists imported: ${summary.setlistsImported}`)
  if (summary.setlistsRenamed > 0) lines.push(`Setlists renamed (name already taken): ${summary.setlistsRenamed}`)
  for (const missing of summary.missingSetlistSongs.slice(0, MAX_LISTED_ERRORS)) {
    lines.push(`Setlist "${missing.setlist}": ${missing.count} ${missing.count === 1 ? 'song' : 'songs'} not found`)
  }
  if (parsed.invalid.length > 0) {
    lines.push(`Invalid (not imported): ${parsed.invalid.length}`, '', ...parsed.invalid.slice(0, MAX_LISTED_ERRORS))
    if (parsed.invalid.length > MAX_LISTED_ERRORS) lines.push(`... and ${parsed.invalid.length - MAX_LISTED_ERRORS} more`)
  }
  await messageBox(parent, 'Import finished.', lines.join('\n'), parsed.invalid.length > 0 ? 'warning' : 'info')
}
