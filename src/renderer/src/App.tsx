import { useCallback, useEffect, useRef, useState } from 'react'
import { MIN_SEARCH_LENGTH } from '../../shared/types'
import type { CategoryList, CurrentFile, InterpreterList, MenuCommand, SongFilter, SongListItem, Theme } from '../../shared/types'
import { errorMessage, unwrap } from './api'
import { ConfirmDialog } from './components/Dialogs'
import { NameEditDialog } from './components/NameEditDialog'
import { SearchBar } from './components/SearchBar'
import { Sidebar } from './components/Sidebar'
import type { Selection, SidebarTab } from './components/Sidebar'
import { SongEditor } from './components/SongEditor'
import { SongPreview } from './components/SongPreview'
import { SongTable } from './components/SongTable'
import { Toolbar } from './components/Toolbar'
import { WelcomeScreen } from './components/WelcomeScreen'

type Target = 'category' | 'interpreter'

type DialogState =
  | { kind: 'add'; target: Target }
  | { kind: 'rename'; target: Target; id: number; name: string }
  | { kind: 'delete-item'; target: Target; id: number; name: string; songCount: number }
  | { kind: 'delete-song'; song: { id: number; title: string } }

type View = { mode: 'list' } | { mode: 'edit'; songId: number | null } | { mode: 'preview'; songId: number; print: boolean }

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`
}

export default function App(): React.JSX.Element | null {
  const [ready, setReady] = useState(false)
  const [theme, setThemeState] = useState<Theme>('dark')
  const [file, setFile] = useState<CurrentFile | null>(null)
  const [tab, setTab] = useState<SidebarTab>('categories')
  const [selection, setSelection] = useState<Selection>({ kind: 'all' })
  const [search, setSearch] = useState('')
  const [songs, setSongs] = useState<SongListItem[]>([])
  const [categories, setCategories] = useState<CategoryList | null>(null)
  const [interpreters, setInterpreters] = useState<InterpreterList | null>(null)
  const [selectedSongId, setSelectedSongId] = useState<number | null>(null)
  const [view, setView] = useState<View>({ mode: 'list' })
  const [dialog, setDialog] = useState<DialogState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const searchRef = useRef<HTMLInputElement>(null)

  const searching = search.trim().length >= MIN_SEARCH_LENGTH
  let filter: SongFilter
  if (searching) filter = { kind: 'search', term: search.trim() }
  else if (selection.kind === 'all') filter = { kind: 'all' }
  else if (tab === 'categories') filter = { kind: 'category', id: selection.id }
  else filter = { kind: 'interpreter', id: selection.id }
  const filterKey = JSON.stringify(filter)

  const showError = useCallback((e: unknown) => setError(errorMessage(e)), [])

  const changeTheme = useCallback(
    (next: Theme) => {
      setThemeState(next)
      unwrap(window.api.settings.setTheme(next)).catch(showError)
    },
    [showError]
  )

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  const loadFile = useCallback(async () => {
    try {
      setFile(await unwrap(window.api.file.getCurrent()))
    } catch (e) {
      showError(e)
    }
  }, [showError])

  // Initial load, and whenever the main process switches the file.
  useEffect(() => {
    unwrap(window.api.settings.getTheme())
      .then(setThemeState)
      .catch(() => undefined)
    void loadFile().then(() => setReady(true))
    return window.api.onDbChanged(() => {
      setView({ mode: 'list' })
      setSelection({ kind: 'all' })
      setSearch('')
      setSelectedSongId(null)
      setDialog(null)
      setError(null)
      void loadFile()
    })
  }, [loadFile])

  const reloadLists = useCallback(async () => {
    try {
      const [cats, interps] = await Promise.all([unwrap(window.api.categories.list()), unwrap(window.api.interpreters.list())])
      setCategories(cats)
      setInterpreters(interps)
    } catch (e) {
      showError(e)
    }
  }, [showError])

  const dataChanged = useCallback(() => {
    setReloadToken((n) => n + 1)
    void reloadLists()
  }, [reloadLists])

  useEffect(() => window.api.onDataChanged(dataChanged), [dataChanged])

  const filePath = file?.path ?? null

  useEffect(() => {
    if (filePath === null) {
      setCategories(null)
      setInterpreters(null)
      setSongs([])
      return
    }
    void reloadLists()
  }, [filePath, reloadLists])

  useEffect(() => {
    if (filePath === null) return
    let cancelled = false
    unwrap(window.api.songs.list(JSON.parse(filterKey) as SongFilter))
      .then((list) => {
        if (!cancelled) setSongs(list)
      })
      .catch((e) => {
        if (!cancelled) showError(e)
      })
    return () => {
      cancelled = true
    }
  }, [filePath, filterKey, reloadToken, showError])

  const selectedSong = songs.find((s) => s.id === selectedSongId)
  const activeSongId = view.mode === 'list' ? selectedSong?.id : (view.songId ?? undefined)
  const activeSong = songs.find((s) => s.id === activeSongId)

  async function printPage(): Promise<void> {
    try {
      await unwrap(window.api.print.printPage())
    } catch (e) {
      showError(e)
    }
  }

  function previewSong(): void {
    if (view.mode === 'list' && selectedSong) setView({ mode: 'preview', songId: selectedSong.id, print: false })
  }

  function printSong(): void {
    if (view.mode === 'preview') void printPage()
    else if (view.mode === 'list' && selectedSong) setView({ mode: 'preview', songId: selectedSong.id, print: true })
  }

  const commandHandler = useRef<(command: MenuCommand) => void>(() => undefined)
  commandHandler.current = (command) => {
    if (command === 'theme-dark') changeTheme('dark')
    else if (command === 'theme-light') changeTheme('light')
    else if (command === 'new-song' && file) setView({ mode: 'edit', songId: null })
    else if (command === 'preview-song' && file) previewSong()
    else if (command === 'print-song' && file) printSong()
    else if (command === 'focus-search' && file && view.mode === 'list') searchRef.current?.focus()
  }
  useEffect(() => window.api.onMenuCommand((command) => commandHandler.current(command)), [])

  async function runFileAction(action: () => Promise<unknown>): Promise<void> {
    try {
      await action()
    } catch (e) {
      showError(e)
    }
  }

  function changeTab(next: SidebarTab): void {
    setTab(next)
    setSelection({ kind: 'all' })
  }

  async function submitName(name: string): Promise<void> {
    if (!dialog || (dialog.kind !== 'add' && dialog.kind !== 'rename')) return
    const api = dialog.target === 'category' ? window.api.categories : window.api.interpreters
    if (dialog.kind === 'add') {
      const id = await unwrap(api.create(name))
      setSelection({ kind: 'item', id })
    } else {
      await unwrap(api.rename(dialog.id, name))
    }
    setDialog(null)
    dataChanged()
  }

  async function confirmDelete(): Promise<void> {
    if (!dialog) return
    const current = dialog
    setDialog(null)
    try {
      if (current.kind === 'delete-song') {
        await unwrap(window.api.songs.delete(current.song.id))
        setSelectedSongId(null)
        setView({ mode: 'list' })
      } else if (current.kind === 'delete-item') {
        const api = current.target === 'category' ? window.api.categories : window.api.interpreters
        await unwrap(api.delete(current.id))
        if (selection.kind === 'item' && selection.id === current.id) setSelection({ kind: 'all' })
      }
      dataChanged()
    } catch (e) {
      showError(e)
    }
  }

  if (!ready) return null

  const shell = (content: React.ReactNode): React.JSX.Element => (
    <div className="shell">
      <Toolbar
        theme={theme}
        locked={view.mode === 'edit'}
        hasFile={file !== null}
        canEdit={activeSong !== undefined}
        canDelete={activeSong !== undefined}
        onNewFile={() => void runFileAction(() => unwrap(window.api.file.newFile()))}
        onOpenFile={() => void runFileAction(() => unwrap(window.api.file.openFile()))}
        onSaveFileAs={() => void runFileAction(() => unwrap(window.api.file.saveAs()))}
        onExportSongs={() => void runFileAction(() => unwrap(window.api.transfer.exportSongs()))}
        onImportSongs={() => void runFileAction(() => unwrap(window.api.transfer.importSongs()))}
        onNewSong={() => setView({ mode: 'edit', songId: null })}
        onEditSong={() => activeSong && setView({ mode: 'edit', songId: activeSong.id })}
        onDeleteSong={() => activeSong && setDialog({ kind: 'delete-song', song: activeSong })}
        onPreviewSong={previewSong}
        onPrintSong={printSong}
        onThemeChange={changeTheme}
      />
      <div className="shell-content">{content}</div>
      {dialog?.kind === 'delete-song' && (
        <ConfirmDialog
          title="Delete song?"
          message={`"${dialog.song.title}" will be permanently deleted.`}
          confirmLabel="Delete"
          danger
          onConfirm={() => void confirmDelete()}
          onCancel={() => setDialog(null)}
        />
      )}
    </div>
  )

  if (!file) {
    return shell(
      <>
        {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
        <WelcomeScreen
          onNew={() => void runFileAction(() => unwrap(window.api.file.newFile()))}
          onOpen={() => void runFileAction(() => unwrap(window.api.file.openFile()))}
          onOpenRecent={(path) => void runFileAction(() => unwrap(window.api.file.openRecent(path)))}
        />
      </>
    )
  }

  if (view.mode === 'preview') {
    return shell(
      <>
        {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
        <SongPreview
          key={view.songId}
          songId={view.songId}
          printOnLoad={view.print}
          onPrintRequested={() => {
            setView((v) => (v.mode === 'preview' && v.print ? { ...v, print: false } : v))
            void printPage()
          }}
          onClose={() => setView({ mode: 'list' })}
          onEdit={() => setView({ mode: 'edit', songId: view.songId })}
        />
      </>
    )
  }

  if (view.mode === 'edit') {
    return shell(
      <SongEditor
        key={view.songId ?? 'new'}
        songId={view.songId}
        categories={categories}
        interpreters={interpreters}
        onClose={() => setView({ mode: 'list' })}
        onChanged={dataChanged}
      />
    )
  }

  const noun: Target = tab === 'categories' ? 'category' : 'interpreter'
  const emptyText = searching
    ? 'No songs match your search.'
    : filter.kind === 'all'
      ? 'No songs yet. Use "New Song" to add one.'
      : 'No songs in this selection.'

  return shell(
    <div className="app">
      <Sidebar
        tab={tab}
        onTabChange={changeTab}
        categories={categories}
        interpreters={interpreters}
        selection={selection}
        dimmed={searching}
        onSelect={setSelection}
        onAdd={() => setDialog({ kind: 'add', target: noun })}
        onRename={(id, name) => setDialog({ kind: 'rename', target: noun, id, name })}
        onDelete={(id, name) => {
          const list = noun === 'category' ? categories?.items : interpreters?.items
          setDialog({ kind: 'delete-item', target: noun, id, name, songCount: list?.find((i) => i.id === id)?.songCount ?? 0 })
        }}
      />

      <main className="main">
        {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
        <div className="toolbar">
          <SearchBar ref={searchRef} value={search} onChange={setSearch} />
        </div>
        <SongTable
          songs={songs}
          selectedId={selectedSongId}
          emptyText={emptyText}
          onSelect={setSelectedSongId}
          onOpen={(id) => setView({ mode: 'edit', songId: id })}
          onDelete={(song) => setDialog({ kind: 'delete-song', song })}
        />
        <footer className="statusbar">{plural(songs.length, 'song')}</footer>
      </main>

      {dialog && (dialog.kind === 'add' || dialog.kind === 'rename') && (
        <NameEditDialog
          title={dialog.kind === 'add' ? `Add ${dialog.target}` : `Rename ${dialog.target}`}
          initialName={dialog.kind === 'rename' ? dialog.name : ''}
          submitLabel={dialog.kind === 'add' ? 'Add' : 'Rename'}
          onSubmit={submitName}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog?.kind === 'delete-item' && (
        <ConfirmDialog
          title={`Delete ${dialog.target}?`}
          message={
            dialog.target === 'category'
              ? `"${dialog.name}" will be deleted. ${plural(dialog.songCount, 'song')} will move to "(No category)".`
              : `"${dialog.name}" will be deleted and removed from ${plural(dialog.songCount, 'song')}. The songs themselves are kept.`
          }
          confirmLabel="Delete"
          danger
          onConfirm={() => void confirmDelete()}
          onCancel={() => setDialog(null)}
        />
      )}
    </div>
  )
}

function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }): React.JSX.Element {
  return (
    <div className="banner error" role="alert">
      <span>{message}</span>
      <button type="button" className="link" onClick={onDismiss} aria-label="Dismiss">
        Dismiss
      </button>
    </div>
  )
}
