import type { ReactNode } from 'react'

function Icon({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {children}
    </svg>
  )
}

export const NewFileIcon = (): React.JSX.Element => (
  <Icon>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5" />
    <path d="M12 11.5v6M9 14.5h6" />
  </Icon>
)

export const OpenFileIcon = (): React.JSX.Element => (
  <Icon>
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  </Icon>
)

export const SaveFileAsIcon = (): React.JSX.Element => (
  <Icon>
    <path d="M5 3h11l4 4v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
    <path d="M7 3v5h8V3" />
    <path d="M7 21v-7h10v7" />
  </Icon>
)

export const ExportSongsIcon = (): React.JSX.Element => (
  <Icon>
    <path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
    <path d="M12 16V4" />
    <path d="M8 8l4-4 4 4" />
  </Icon>
)

export const ImportSongsIcon = (): React.JSX.Element => (
  <Icon>
    <path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
    <path d="M12 4v12" />
    <path d="M8 12l4 4 4-4" />
  </Icon>
)

export const NewSongIcon = (): React.JSX.Element => (
  <Icon>
    <circle cx="6" cy="18" r="3" />
    <path d="M9 18V4" />
    <path d="M9 4c4 0 7 2 7 6" />
    <path d="M17 14v6M14 17h6" />
  </Icon>
)

export const EditSongIcon = (): React.JSX.Element => (
  <Icon>
    <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z" />
    <path d="M13.5 6.5l4 4" />
  </Icon>
)

export const DeleteSongIcon = (): React.JSX.Element => (
  <Icon>
    <path d="M4 7h16" />
    <path d="M9 7V4h6v3" />
    <path d="M6 7l1 13a2 2 0 0 0 2 1h6a2 2 0 0 0 2-1l1-13" />
    <path d="M10 11v6M14 11v6" />
  </Icon>
)

export const PreviewSongIcon = (): React.JSX.Element => (
  <Icon>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </Icon>
)

export const SetlistsIcon = (): React.JSX.Element => (
  <Icon>
    <path d="M9 6h11M9 12h11M9 18h11" />
    <path d="M4 6h.01M4 18h.01" strokeWidth="3" />
    <path d="M3 12h3" />
  </Icon>
)

export const CircleOfFifthsIcon = (): React.JSX.Element => (
  <Icon>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="4" />
    <path d="M12 3v5M12 16v5M3 12h5M16 12h5" />
  </Icon>
)

export const ChordLookupIcon = (): React.JSX.Element => (
  <Icon>
    <path d="M6 4v16M12 4v16M18 4v16" />
    <path d="M6 4h12M6 10h12M6 16h12" />
    <circle cx="12" cy="13" r="2.2" fill="currentColor" />
    <circle cx="18" cy="7" r="2.2" fill="currentColor" />
  </Icon>
)

export const PrintSongIcon = (): React.JSX.Element => (
  <Icon>
    <path d="M6 9V3h12v6" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <path d="M6 14h12v7H6z" />
  </Icon>
)

export const SunIcon = (): React.JSX.Element => (
  <Icon>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Icon>
)

export const MoonIcon = (): React.JSX.Element => (
  <Icon>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </Icon>
)
