import { contextBridge, ipcRenderer } from 'electron'
import type { MenuCommand, SimpleLyricsApi } from '../shared/types'

const call = <T>(channel: string, ...args: unknown[]): Promise<T> => ipcRenderer.invoke(channel, ...args)

const api: SimpleLyricsApi = {
  file: {
    getCurrent: () => call('file:getCurrent'),
    getRecent: () => call('file:getRecent'),
    newFile: () => call('file:new'),
    openFile: () => call('file:open'),
    openRecent: (path) => call('file:openRecent', path),
    saveAs: () => call('file:saveAs')
  },
  songs: {
    list: (filter, sort) => call('songs:list', filter, sort),
    get: (id) => call('songs:get', id),
    create: (input) => call('songs:create', input),
    update: (id, input) => call('songs:update', id, input),
    delete: (id) => call('songs:delete', id)
  },
  categories: {
    list: () => call('categories:list'),
    create: (name) => call('categories:create', name),
    rename: (id, name) => call('categories:rename', id, name),
    delete: (id) => call('categories:delete', id)
  },
  interpreters: {
    list: () => call('interpreters:list'),
    create: (name) => call('interpreters:create', name),
    rename: (id, name) => call('interpreters:rename', id, name),
    delete: (id) => call('interpreters:delete', id)
  },
  setlists: {
    list: () => call('setlists:list'),
    get: (id) => call('setlists:get', id),
    getForPrint: (id) => call('setlists:getForPrint', id),
    create: (name) => call('setlists:create', name),
    rename: (id, name) => call('setlists:rename', id, name),
    duplicate: (id, name) => call('setlists:duplicate', id, name),
    delete: (id) => call('setlists:delete', id),
    save: (id, name, items) => call('setlists:save', id, name, items),
    usage: (songId) => call('setlists:usage', songId)
  },
  transfer: {
    exportSongs: () => call('transfer:export'),
    importSongs: () => call('transfer:import')
  },
  print: {
    printPage: () => call('print:page')
  },
  settings: {
    getTheme: () => call('settings:getTheme'),
    setTheme: (theme) => call('settings:setTheme', theme)
  },
  onDbChanged: (callback) => {
    const listener = (): void => callback()
    ipcRenderer.on('db:changed', listener)
    return () => ipcRenderer.removeListener('db:changed', listener)
  },
  onDataChanged: (callback) => {
    const listener = (): void => callback()
    ipcRenderer.on('data:changed', listener)
    return () => ipcRenderer.removeListener('data:changed', listener)
  },
  onMenuCommand: (callback) => {
    const listener = (_event: unknown, command: MenuCommand): void => callback(command)
    ipcRenderer.on('menu:command', listener)
    return () => ipcRenderer.removeListener('menu:command', listener)
  }
}

contextBridge.exposeInMainWorld('api', api)
