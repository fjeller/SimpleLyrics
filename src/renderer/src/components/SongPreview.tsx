import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { SongDetail } from '../../../shared/types'
import { errorMessage, unwrap } from '../api'

const MIN_FONT_REM = 1
const MAX_FONT_REM = 1.5
/** Printable width of A4 with 18 mm margins; keeps the printed page in line with the preview. */
const PRINT_CONTENT_WIDTH_PX = 657

/** Largest font size (within the rem limits) at which the longest line still fits the page width. */
function useFittedFontSize(sheet: RefObject<HTMLElement | null>, lines: string[]): number | undefined {
  const [size, setSize] = useState<number>()
  const key = lines.join('\n')

  useLayoutEffect(() => {
    const el = sheet.current
    const sample = el?.querySelector('.sheet-text, .sheet-chords')
    if (!el || !sample) return
    const context = document.createElement('canvas').getContext('2d')
    if (!context) return
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
    context.font = `100px ${getComputedStyle(sample).fontFamily}`
    const longestEm = Math.max(...key.split('\n').map((line) => context.measureText(line.replace(/\t/g, '        ')).width / 100), 1)

    const fit = (): void => {
      const style = getComputedStyle(el)
      const available = Math.min(el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight), PRINT_CONTENT_WIDTH_PX)
      const fitted = (available / longestEm) * 0.98
      setSize(Math.floor(Math.min(Math.max(fitted, MIN_FONT_REM * rem), MAX_FONT_REM * rem) * 2) / 2)
    }
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(el)
    return () => observer.disconnect()
  }, [sheet, key])

  return size
}

interface SongPreviewProps {
  songId: number
  /** Print as soon as the song is shown (used when printing straight from the list). */
  printOnLoad: boolean
  onPrintRequested: () => void
  onClose: () => void
  onEdit: () => void
}

export function SongSheet({ song }: { song: SongDetail }): React.JSX.Element {
  const interpreters = song.interpreters.map((i) => i.name).join(', ')
  const sheetRef = useRef<HTMLElement>(null)
  const fontSize = useFittedFontSize(sheetRef, [...(song.chords ?? '').split('\n'), ...(song.songText ?? '').split('\n')])
  return (
    <article className="sheet" ref={sheetRef} style={fontSize ? ({ '--sheet-font': `${fontSize}px` } as React.CSSProperties) : undefined}>
      <h1 className="sheet-title">{song.title}</h1>
      {(interpreters || song.capo > 0) && (
        <div className="sheet-sub">
          <span>{interpreters}</span>
          {song.capo > 0 && <span>Capo: {song.capo}</span>}
        </div>
      )}
      <hr className="sheet-rule" />
      {song.chords && <pre className="sheet-chords">{song.chords}</pre>}
      {song.songText && <pre className="sheet-text">{song.songText}</pre>}
    </article>
  )
}

export function SongPreview({ songId, printOnLoad, onPrintRequested, onClose, onEdit }: SongPreviewProps): React.JSX.Element {
  const [song, setSong] = useState<SongDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const printRequested = useRef(onPrintRequested)
  printRequested.current = onPrintRequested

  useEffect(() => {
    let cancelled = false
    unwrap(window.api.songs.get(songId))
      .then((loaded) => {
        if (cancelled) return
        if (loaded) setSong(loaded)
        else setError('The song no longer exists.')
      })
      .catch((e) => {
        if (!cancelled) setError(errorMessage(e))
      })
    return () => {
      cancelled = true
    }
  }, [songId])

  useEffect(() => {
    rootRef.current?.focus()
  }, [])

  // Wait two frames so the sheet is laid out before the print dialog captures the page.
  useEffect(() => {
    if (!song || !printOnLoad) return
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => printRequested.current()))
    return () => cancelAnimationFrame(frame)
  }, [song, printOnLoad])

  return (
    <div className="preview" ref={rootRef} tabIndex={-1} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <header className="preview-header">
        <button type="button" onClick={onClose}>
          Close
        </button>
        <h2>Preview</h2>
        <div className="editor-header-actions">
          <button type="button" onClick={onEdit} disabled={!song}>
            Edit
          </button>
          <button type="button" className="primary" onClick={onPrintRequested} disabled={!song}>
            Print...
          </button>
        </div>
      </header>
      {error && (
        <p className="banner error" role="alert">
          {error}
        </p>
      )}
      <div className="preview-scroll">{song && <SongSheet song={song} />}</div>
    </div>
  )
}
