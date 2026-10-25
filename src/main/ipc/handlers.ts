import { BrowserWindow, ipcMain } from 'electron'
import { z } from 'zod'
import { UserError } from '../errors'
import { getCurrentFile, getHandle, getRecent, newFile, openFile, openPath, saveAs } from '../files'
import { createCategory, deleteCategory, listCategories, renameCategory } from '../repositories/categories'
import { createInterpreter, deleteInterpreter, listInterpreters, renameInterpreter } from '../repositories/interpreters'
import { createSong, deleteSong, getSong, listSongs, updateSong } from '../repositories/songs'
import { getTheme, setTheme } from '../settings'
import { exportSongsToFile, importSongsFromFile } from '../transferFiles'
import { printPage } from '../printing'
import type { ApiResult } from '../../shared/types'
import { formatValidationError, idSchema, nameSchema, songFilterSchema, songInputSchema, songSortSchema, themeSchema } from './validation'

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value)
  if (!result.success) throw new UserError(formatValidationError(result.error))
  return result.data
}

function toErrorMessage(e: unknown): string {
  if (e instanceof UserError) return e.message
  console.error(e)
  return `Unexpected error: ${e instanceof Error ? e.message : String(e)}`
}

function handle<T>(channel: string, fn: (event: Electron.IpcMainInvokeEvent, ...args: unknown[]) => T | Promise<T>): void {
  ipcMain.handle(channel, async (event, ...args): Promise<ApiResult<T>> => {
    try {
      return { ok: true, data: await fn(event, ...args) }
    } catch (e) {
      return { ok: false, error: toErrorMessage(e) }
    }
  })
}

function windowOf(event: Electron.IpcMainInvokeEvent): BrowserWindow | null {
  return BrowserWindow.fromWebContents(event.sender)
}

export function registerIpcHandlers(): void {
  handle('file:getCurrent', () => getCurrentFile())
  handle('file:getRecent', () => getRecent())
  handle('file:new', (event) => newFile(windowOf(event)))
  handle('file:open', (event) => openFile(windowOf(event)))
  handle('file:openRecent', (_e, path) => openPath(parse(z.string().min(1), path)))
  handle('file:saveAs', (event) => saveAs(windowOf(event)))

  handle('songs:list', (_e, filter, sort) => listSongs(getHandle().db, parse(songFilterSchema, filter), parse(songSortSchema.optional(), sort)))
  handle('songs:get', (_e, id) => getSong(getHandle().db, parse(idSchema, id)))
  handle('songs:create', (_e, input) => createSong(getHandle().db, parse(songInputSchema, input)))
  handle('songs:update', (_e, id, input) => updateSong(getHandle().db, parse(idSchema, id), parse(songInputSchema, input)))
  handle('songs:delete', (_e, id) => deleteSong(getHandle().db, parse(idSchema, id)))

  handle('categories:list', () => listCategories(getHandle().db))
  handle('categories:create', (_e, name) => createCategory(getHandle().db, parse(nameSchema, name)))
  handle('categories:rename', (_e, id, name) => renameCategory(getHandle().db, parse(idSchema, id), parse(nameSchema, name)))
  handle('categories:delete', (_e, id) => deleteCategory(getHandle().db, parse(idSchema, id)))

  handle('interpreters:list', () => listInterpreters(getHandle().db))
  handle('interpreters:create', (_e, name) => createInterpreter(getHandle().db, parse(nameSchema, name)))
  handle('interpreters:rename', (_e, id, name) => renameInterpreter(getHandle().db, parse(idSchema, id), parse(nameSchema, name)))
  handle('interpreters:delete', (_e, id) => deleteInterpreter(getHandle().db, parse(idSchema, id)))

  handle('transfer:export', (event) => exportSongsToFile(windowOf(event)))
  handle('transfer:import', (event) => importSongsFromFile(windowOf(event)))
  handle('print:page', (event) => printPage(event.sender))

  handle('settings:getTheme', () => getTheme())
  handle('settings:setTheme', (_e, theme) => setTheme(parse(themeSchema, theme)))
}
