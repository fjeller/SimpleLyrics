import { app, dialog, Menu, type BrowserWindow, type MenuItemConstructorOptions } from 'electron'
import { getRecent, newFile, openFile, openPath, saveAs } from './files'
import { UserError } from './errors'
import { exportSongsToFile, importSongsFromFile } from './transferFiles'
import type { MenuCommand } from '../shared/types'

type WindowGetter = () => BrowserWindow | null

async function run(action: () => Promise<unknown> | unknown): Promise<void> {
  try {
    await action()
  } catch (e) {
    const message = e instanceof UserError ? e.message : `Unexpected error: ${e instanceof Error ? e.message : String(e)}`
    dialog.showErrorBox('SimpleLyrics', message)
  }
}

export function buildMenu(getWindow: WindowGetter, hasOpenFile: boolean): void {
  const send = (command: MenuCommand): void => getWindow()?.webContents.send('menu:command', command)
  const isMac = process.platform === 'darwin'

  const recent = getRecent()
  const recentItems: MenuItemConstructorOptions[] =
    recent.length === 0
      ? [{ label: 'No recent files', enabled: false }]
      : recent.map((file) => ({
          label: file.exists ? file.name : `${file.name} (missing)`,
          sublabel: file.path,
          click: () => void run(() => openPath(file.path))
        }))

  const template: MenuItemConstructorOptions[] = [
    ...(isMac ? [{ role: 'appMenu' as const }] : []),
    {
      label: 'File',
      submenu: [
        { label: 'New File...', accelerator: 'CmdOrCtrl+Shift+N', click: () => void run(() => newFile(getWindow())) },
        { label: 'Open File...', accelerator: 'CmdOrCtrl+O', click: () => void run(() => openFile(getWindow())) },
        { label: 'Open Recent', submenu: recentItems },
        { type: 'separator' },
        { label: 'Save File As...', accelerator: 'CmdOrCtrl+Shift+S', enabled: hasOpenFile, click: () => void run(() => saveAs(getWindow())) },
        { type: 'separator' },
        { label: 'Export Songs as JSON...', enabled: hasOpenFile, click: () => void run(() => exportSongsToFile(getWindow())) },
        { label: 'Import Songs from JSON...', enabled: hasOpenFile, click: () => void run(() => importSongsFromFile(getWindow())) },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    { role: 'editMenu' },
    {
      label: 'Songs',
      submenu: [
        { label: 'New Song', accelerator: 'CmdOrCtrl+N', enabled: hasOpenFile, click: () => send('new-song') },
        { label: 'Preview Song', accelerator: 'CmdOrCtrl+Shift+P', enabled: hasOpenFile, click: () => send('preview-song') },
        { label: 'Print Song...', accelerator: 'CmdOrCtrl+P', enabled: hasOpenFile, click: () => send('print-song') },
        { label: 'Search', accelerator: 'CmdOrCtrl+F', enabled: hasOpenFile, click: () => send('focus-search') }
      ]
    },
    {
      label: 'View',
      submenu: [
        { label: 'Dark Theme', click: () => send('theme-dark') },
        { label: 'Light Theme', click: () => send('theme-light') },
        { type: 'separator' },
        { label: 'Chord Lookup', click: () => send('show-chords') },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        ...(app.isPackaged ? [] : ([{ type: 'separator' }, { role: 'reload' }, { role: 'toggleDevTools' }] as MenuItemConstructorOptions[]))
      ]
    }
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}
