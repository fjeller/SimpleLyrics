import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import type { Theme } from '../shared/types'

interface SettingsData {
  theme: Theme
  lastFile: string | null
  recentFiles: string[]
}

const MAX_RECENT = 10

const defaults: SettingsData = { theme: 'dark', lastFile: null, recentFiles: [] }

let filePath = ''
let data: SettingsData = { ...defaults }

export function initSettings(path: string): void {
  filePath = path
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as Partial<SettingsData>
    data = {
      theme: parsed.theme === 'light' ? 'light' : 'dark',
      lastFile: typeof parsed.lastFile === 'string' ? parsed.lastFile : null,
      recentFiles: Array.isArray(parsed.recentFiles)
        ? parsed.recentFiles.filter((p): p is string => typeof p === 'string').slice(0, MAX_RECENT)
        : []
    }
  } catch {
    data = { ...defaults }
  }
}

function persist(): void {
  try {
    mkdirSync(dirname(filePath), { recursive: true })
    writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8')
  } catch (e) {
    console.error('Could not save settings', e)
  }
}

export function getTheme(): Theme {
  return data.theme
}

export function setTheme(theme: Theme): void {
  data.theme = theme
  persist()
}

export function getLastFile(): string | null {
  return data.lastFile
}

export function setLastFile(path: string | null): void {
  data.lastFile = path
  persist()
}

export function getRecentFiles(): string[] {
  return [...data.recentFiles]
}

export function addRecentFile(path: string): void {
  const same = (a: string, b: string): boolean => (process.platform === 'linux' ? a === b : a.toLowerCase() === b.toLowerCase())
  data.recentFiles = [path, ...data.recentFiles.filter((p) => !same(p, path))].slice(0, MAX_RECENT)
  persist()
}

export function removeRecentFile(path: string): void {
  data.recentFiles = data.recentFiles.filter((p) => p !== path)
  if (data.lastFile === path) data.lastFile = null
  persist()
}
