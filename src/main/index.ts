import { existsSync } from 'node:fs'
import { extname, join } from 'node:path'
import { app, BrowserWindow, shell } from 'electron'
import { closeCurrent, FILE_EXTENSION, getCurrentFile, initFiles, onCurrentFileChanged, openPath } from './files'
import { registerIpcHandlers } from './ipc/handlers'
import { buildMenu } from './menu'
import { getLastFile, initSettings } from './settings'

const APP_NAME = 'SimpleLyrics'

let mainWindow: BrowserWindow | null = null
let pendingOpenFile: string | undefined

function songFileFromArgs(args: string[]): string | undefined {
  return args.find((arg) => extname(arg).toLowerCase() === `.${FILE_EXTENSION}` && existsSync(arg))
}

function refreshWindowState(): void {
  const file = getCurrentFile()
  mainWindow?.setTitle(file ? `${file.name} - ${APP_NAME}` : APP_NAME)
  mainWindow?.webContents.send('db:changed')
  buildMenu(() => mainWindow, file !== null)
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 760,
    minWidth: 800,
    minHeight: 500,
    show: false,
    title: APP_NAME,
    backgroundColor: '#1e1f22',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  mainWindow.once('ready-to-show', () => mainWindow?.show())
  mainWindow.on('closed', () => {
    mainWindow = null
  })
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url !== mainWindow?.webContents.getURL()) event.preventDefault()
  })

  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (!app.isPackaged && devUrl) {
    void mainWindow.loadURL(devUrl)
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
  refreshWindowState()
}

function openFromExternal(path: string): void {
  try {
    openPath(path)
  } catch (e) {
    console.error('Could not open file', e)
  }
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.setName(APP_NAME)

  app.on('second-instance', (_event, argv) => {
    const file = songFileFromArgs(argv.slice(1))
    if (file) openFromExternal(file)
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.on('open-file', (event, path) => {
    event.preventDefault()
    if (app.isReady()) openFromExternal(path)
    else pendingOpenFile = path
  })

  void app.whenReady().then(() => {
    initSettings(join(app.getPath('userData'), 'settings.json'))
    initFiles(app.isPackaged ? join(process.resourcesPath, 'drizzle') : join(app.getAppPath(), 'drizzle'))
    registerIpcHandlers()
    onCurrentFileChanged(refreshWindowState)

    const startup = pendingOpenFile ?? songFileFromArgs(process.argv.slice(1)) ?? getLastFile()
    if (startup && existsSync(startup)) openFromExternal(startup)

    createWindow()
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })

  app.on('will-quit', closeCurrent)
}
