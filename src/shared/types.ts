export const LIMITS = {
  title: 200,
  key: 10,
  firstLine: 100,
  chords: 2000,
  name: 200,
  capoMax: 12
} as const

/** Search starts at this many characters; shorter terms fall back to the sidebar selection. */
export const MIN_SEARCH_LENGTH = 3

export type Theme = 'dark' | 'light'

export interface CategoryDto {
  id: number
  name: string
  songCount: number
}

export interface InterpreterDto {
  id: number
  name: string
  songCount: number
}

export interface NamedRef {
  id: number
  name: string
}

/** Sidebar lists with the virtual entries pre-counted. */
export interface CategoryList {
  items: CategoryDto[]
  totalSongs: number
  uncategorizedSongs: number
}

export interface InterpreterList {
  items: InterpreterDto[]
  totalSongs: number
  withoutInterpreterSongs: number
}

/** `id: null` selects the virtual "(No category)" / "(No interpreter)" entry. */
export type SongFilter =
  | { kind: 'all' }
  | { kind: 'category'; id: number | null }
  | { kind: 'interpreter'; id: number | null }
  | { kind: 'search'; term: string }

/** Empty interpreters / categories sort first ascending and last descending. */
export type SongSortColumn = 'title' | 'interpreters' | 'category'

export interface SongSort {
  column: SongSortColumn
  direction: 'asc' | 'desc'
}

export const DEFAULT_SONG_SORT: SongSort = { column: 'title', direction: 'asc' }

export interface SongListItem {
  id: number
  title: string
  interpreters: string
  category: string | null
  capo: number
  firstLine: string | null
}

export interface SongDetail {
  id: number
  title: string
  key: string | null
  originalKey: string | null
  firstLine: string | null
  categoryId: number | null
  capo: number
  songText: string | null
  chords: string | null
  interpreters: NamedRef[]
}

export interface SongInput {
  title: string
  key: string | null
  originalKey: string | null
  firstLine: string | null
  capo: number
  songText: string | null
  chords: string | null
  /** Existing category id, or null for none. */
  categoryId: number | null
  /** If set, takes precedence over categoryId; created when it does not exist yet. */
  newCategoryName: string | null
  interpreterIds: number[]
  newInterpreterNames: string[]
}

export interface RecentFile {
  path: string
  name: string
  exists: boolean
}

export interface CurrentFile {
  path: string
  name: string
}

export type MenuCommand =
  | 'new-song'
  | 'focus-search'
  | 'theme-dark'
  | 'theme-light'
  | 'preview-song'
  | 'print-song'
  | 'show-chords'
  | 'show-circle-of-fifths'
  | 'show-setlists'

export type SetlistItemInput = { kind: 'song'; songId: number } | { kind: 'break' }

export interface SetlistSummary {
  id: number
  name: string
  songCount: number
  setCount: number
}

export type SetlistItem = { kind: 'song'; songId: number; title: string; interpreters: string } | { kind: 'break' }

export interface SetlistDetail {
  id: number
  name: string
  items: SetlistItem[]
}

export interface SetlistPrintData {
  id: number
  name: string
  /** The songs of each set, in order; empty sets are left out. */
  sets: SongDetail[][]
}

export const EXPORT_FORMAT = 'simplelyrics-songs'
export const EXPORT_VERSION = 1

/** Songs reference category and interpreters by name so an export can be imported into any file. */
export interface ExportedSong {
  title: string
  key: string | null
  originalKey: string | null
  firstLine: string | null
  capo: number
  songText: string | null
  chords: string | null
  category: string | null
  interpreters: string[]
}

/** Setlist songs are referenced by title and interpreters, the same rule the import uses for duplicates. */
export type ExportedSetlistItem = { kind: 'song'; title: string; interpreters: string[] } | { kind: 'break' }

export interface ExportedSetlist {
  name: string
  items: ExportedSetlistItem[]
}

export interface SongExport {
  format: typeof EXPORT_FORMAT
  version: typeof EXPORT_VERSION
  exportedAt: string
  categories: string[]
  interpreters: string[]
  songs: ExportedSong[]
  /** Optional; exports from older versions have none. */
  setlists?: ExportedSetlist[]
}

export interface ImportResult {
  imported: number
  /** Songs with the same title and interpreters that already exist. */
  skipped: number
  categoriesAdded: number
  interpretersAdded: number
  setlistsImported: number
  /** Setlists imported under a numbered name because the name was taken. */
  setlistsRenamed: number
  /** Setlist entries whose song is not in the file, per setlist name. */
  missingSetlistSongs: { setlist: string; count: number }[]
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string }

export interface SimpleLyricsApi {
  file: {
    getCurrent(): Promise<ApiResult<CurrentFile | null>>
    getRecent(): Promise<ApiResult<RecentFile[]>>
    newFile(): Promise<ApiResult<CurrentFile | null>>
    openFile(): Promise<ApiResult<CurrentFile | null>>
    openRecent(path: string): Promise<ApiResult<CurrentFile | null>>
    saveAs(): Promise<ApiResult<CurrentFile | null>>
  }
  songs: {
    list(filter: SongFilter, sort?: SongSort): Promise<ApiResult<SongListItem[]>>
    get(id: number): Promise<ApiResult<SongDetail | null>>
    create(input: SongInput): Promise<ApiResult<number>>
    update(id: number, input: SongInput): Promise<ApiResult<void>>
    delete(id: number): Promise<ApiResult<void>>
  }
  categories: {
    list(): Promise<ApiResult<CategoryList>>
    create(name: string): Promise<ApiResult<number>>
    rename(id: number, name: string): Promise<ApiResult<void>>
    delete(id: number): Promise<ApiResult<void>>
  }
  interpreters: {
    list(): Promise<ApiResult<InterpreterList>>
    create(name: string): Promise<ApiResult<number>>
    rename(id: number, name: string): Promise<ApiResult<void>>
    delete(id: number): Promise<ApiResult<void>>
  }
  setlists: {
    list(): Promise<ApiResult<SetlistSummary[]>>
    get(id: number): Promise<ApiResult<SetlistDetail | null>>
    getForPrint(id: number): Promise<ApiResult<SetlistPrintData | null>>
    create(name: string): Promise<ApiResult<number>>
    rename(id: number, name: string): Promise<ApiResult<void>>
    duplicate(id: number, name: string): Promise<ApiResult<number>>
    delete(id: number): Promise<ApiResult<void>>
    /** Saves name and items in one transaction; breaks that would create empty sets are dropped. */
    save(id: number, name: string, items: SetlistItemInput[]): Promise<ApiResult<void>>
    /** Number of setlists that contain the song. */
    usage(songId: number): Promise<ApiResult<number>>
  }
  transfer: {
    exportSongs(): Promise<ApiResult<void>>
    importSongs(): Promise<ApiResult<void>>
  }
  print: {
    /** Opens the system print dialog for the current page. Resolves when the dialog was closed. */
    printPage(): Promise<ApiResult<void>>
  }
  settings: {
    getTheme(): Promise<ApiResult<Theme>>
    setTheme(theme: Theme): Promise<ApiResult<void>>
  }
  onDbChanged(callback: () => void): () => void
  /** Fired after songs were imported into the open file. */
  onDataChanged(callback: () => void): () => void
  onMenuCommand(callback: (command: MenuCommand) => void): () => void
}
