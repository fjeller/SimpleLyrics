import type { ReactNode } from 'react'
import type { Theme } from '../../../shared/types'
import { ChordLookupIcon, CircleOfFifthsIcon, DeleteSongIcon, EditSongIcon, ExportSongsIcon, ImportSongsIcon, MoonIcon, NewFileIcon, NewSongIcon, OpenFileIcon, PreviewSongIcon, PrintSongIcon, SaveFileAsIcon, SunIcon } from './Icons'

interface ToolbarProps {
  theme: Theme
  /** Disables the file and song-creation commands (e.g. while the song editor is open). */
  locked: boolean
  hasFile: boolean
  canEdit: boolean
  canDelete: boolean
  onNewFile: () => void
  onOpenFile: () => void
  onSaveFileAs: () => void
  onExportSongs: () => void
  onImportSongs: () => void
  onNewSong: () => void
  onEditSong: () => void
  onDeleteSong: () => void
  onPreviewSong: () => void
  onPrintSong: () => void
  onChordLookup: () => void
  onCircleOfFifths: () => void
  onThemeChange: (theme: Theme) => void
}

interface IconButtonProps {
  label: string
  disabled: boolean
  danger?: boolean
  onClick: () => void
  children: ReactNode
}

function IconButton({ label, disabled, danger, onClick, children }: IconButtonProps): React.JSX.Element {
  return (
    <button type="button" className={`icon-button${danger ? ' danger-icon' : ''}`} title={label} aria-label={label} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  )
}

export function Toolbar(props: ToolbarProps): React.JSX.Element {
  const { theme, locked, hasFile, canEdit, canDelete } = props
  const dark = theme === 'dark'

  return (
    <div className="app-toolbar" role="toolbar" aria-label="Main toolbar">
      <IconButton label="New file" disabled={locked} onClick={props.onNewFile}>
        <NewFileIcon />
      </IconButton>
      <IconButton label="Open file" disabled={locked} onClick={props.onOpenFile}>
        <OpenFileIcon />
      </IconButton>
      <IconButton label="Save file as (saves a copy under a new name)" disabled={locked || !hasFile} onClick={props.onSaveFileAs}>
        <SaveFileAsIcon />
      </IconButton>

      <span className="toolbar-separator" role="separator" aria-orientation="vertical" />

      <IconButton label="New song" disabled={locked || !hasFile} onClick={props.onNewSong}>
        <NewSongIcon />
      </IconButton>
      <IconButton label="Edit song" disabled={locked || !canEdit} onClick={props.onEditSong}>
        <EditSongIcon />
      </IconButton>
      <IconButton label="Delete song" danger disabled={!canDelete} onClick={props.onDeleteSong}>
        <DeleteSongIcon />
      </IconButton>

      <span className="toolbar-separator" role="separator" aria-orientation="vertical" />

      <IconButton label="Preview song" disabled={locked || !canEdit} onClick={props.onPreviewSong}>
        <PreviewSongIcon />
      </IconButton>
      <IconButton label="Print song" disabled={locked || !canEdit} onClick={props.onPrintSong}>
        <PrintSongIcon />
      </IconButton>

      <span className="toolbar-separator" role="separator" aria-orientation="vertical" />

      <IconButton label="Chord lookup" disabled={locked} onClick={props.onChordLookup}>
        <ChordLookupIcon />
      </IconButton>
      <IconButton label="Circle of fifths" disabled={locked} onClick={props.onCircleOfFifths}>
        <CircleOfFifthsIcon />
      </IconButton>

      <span className="toolbar-spacer" />

      <IconButton label="Export songs as JSON" disabled={locked || !hasFile} onClick={props.onExportSongs}>
        <ExportSongsIcon />
      </IconButton>
      <IconButton label="Import songs from JSON" disabled={locked || !hasFile} onClick={props.onImportSongs}>
        <ImportSongsIcon />
      </IconButton>

      <span className="toolbar-separator" role="separator" aria-orientation="vertical" />

      <button
        type="button"
        role="switch"
        aria-checked={dark}
        aria-label="Dark mode"
        title={dark ? 'Switch to light theme' : 'Switch to dark theme'}
        className="theme-switch"
        onClick={() => props.onThemeChange(dark ? 'light' : 'dark')}
      >
        <span className={`switch-icon${dark ? '' : ' active'}`}>
          <SunIcon />
        </span>
        <span className="switch-track" aria-hidden="true">
          <span className="switch-thumb" />
        </span>
        <span className={`switch-icon${dark ? ' active' : ''}`}>
          <MoonIcon />
        </span>
      </button>
    </div>
  )
}
