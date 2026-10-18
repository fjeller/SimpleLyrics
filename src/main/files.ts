import { existsSync } from 'node:fs'
import { basename, extname } from 'node:path'
import { dialog, type BrowserWindow } from 'electron'
import { closeDatabase, InvalidDatabaseFileError, openDatabase, removeDatabaseFiles, type DbHandle } from './db/connection'
import { UserError } from './errors'
import { addRecentFile, getRecentFiles, removeRecentFile, setLastFile } from './settings'
import type { CurrentFile, RecentFile } from '../shared/types'

export const FILE_EXTENSION = 'sng'

const fileFilters = [{ name: 'SimpleLyrics file', extensions: [FILE_EXTENSION] }]

let migrationsFolder = ''
let current: DbHandle | null = null
const listeners = new Set<() => void>()

export function initFiles(folder: string): void {
  migrationsFolder = folder
}

/** Called after the active database changed (opened, switched or closed). */
export function onCurrentFileChanged(listener: () => void): void {
  listeners.add(listener)
}

function notify(): void {
  for (const listener of listeners) listener()
}

export function getHandle(): DbHandle {
  if (!current) throw new UserError('No file is open.')
  return current
}

export function getCurrentFile(): CurrentFile | null {
  return current ? { path: current.path, name: basename(current.path) } : null
}

export function getRecent(): RecentFile[] {
  return getRecentFiles().map((path) => ({ path, name: basename(path), exists: existsSync(path) }))
}

function switchTo(handle: DbHandle): CurrentFile {
  const previous = current
  current = handle
  if (previous?.sqlite.open) closeDatabase(previous)
  addRecentFile(handle.path)
  setLastFile(handle.path)
  notify()
  return { path: handle.path, name: basename(handle.path) }
}

export function closeCurrent(): void {
  if (current?.sqlite.open) closeDatabase(current)
  current = null
}

function withExtension(path: string): string {
  return extname(path) ? path : `${path}.${FILE_EXTENSION}`
}

function open(path: string, mode: 'open' | 'create'): CurrentFile {
  try {
    return switchTo(openDatabase(path, migrationsFolder, mode))
  } catch (e) {
    if (e instanceof InvalidDatabaseFileError) throw new UserError(e.message)
    throw e
  }
}

/** Returns null when the user cancels. */
export async function newFile(parent: BrowserWindow | null): Promise<CurrentFile | null> {
  const options = { title: 'New file', defaultPath: `Songs.${FILE_EXTENSION}`, filters: fileFilters }
  const result = parent ? await dialog.showSaveDialog(parent, options) : await dialog.showSaveDialog(options)
  if (result.canceled || !result.filePath) return null
  const target = withExtension(result.filePath)
  if (current && samePath(current.path, target)) {
    throw new UserError('This file is currently open. Choose a different name.')
  }
  return open(target, 'create')
}

export async function openFile(parent: BrowserWindow | null): Promise<CurrentFile | null> {
  const options = { title: 'Open file', filters: fileFilters, properties: ['openFile' as const] }
  const result = parent ? await dialog.showOpenDialog(parent, options) : await dialog.showOpenDialog(options)
  if (result.canceled || result.filePaths.length === 0) return null
  return openPath(result.filePaths[0])
}

export function openPath(path: string): CurrentFile {
  if (!existsSync(path)) {
    removeRecentFile(path)
    notify()
    throw new UserError('The file no longer exists and was removed from the recent files.')
  }
  if (current && samePath(current.path, path)) return { path: current.path, name: basename(current.path) }
  return open(path, 'open')
}

/** Copies the open database to a new file and continues working in the copy. */
export async function saveAs(parent: BrowserWindow | null): Promise<CurrentFile | null> {
  const handle = getHandle()
  const options = { title: 'Save file as', defaultPath: basename(handle.path), filters: fileFilters }
  const result = parent ? await dialog.showSaveDialog(parent, options) : await dialog.showSaveDialog(options)
  if (result.canceled || !result.filePath) return null
  const target = withExtension(result.filePath)
  if (samePath(handle.path, target)) throw new UserError('This is already the open file. Choose a different name.')
  removeDatabaseFiles(target)
  await handle.sqlite.backup(target)
  return open(target, 'open')
}

function samePath(a: string, b: string): boolean {
  return process.platform === 'linux' ? a === b : a.toLowerCase() === b.toLowerCase()
}
