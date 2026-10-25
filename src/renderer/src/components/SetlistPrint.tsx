import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { SetlistPrintData } from '../../../shared/types'
import { errorMessage, unwrap } from '../api'
import { SongSheet } from './SongPreview'

/** Printable height of A4 with 18 mm margins at 96 dpi; the width (657 px) is set in the stylesheet. */
const PAGE_HEIGHT_PX = 986
const PT = 96 / 72
const MAX_FONT_PT = 22
const MIN_FONT_PT = 12

interface Layout {
  columns: 1 | 2
  fontPt: number
}

/**
 * Picks the largest font at which the setlist fits on one page: one column first, then two columns as long as
 * no title wraps. Very long setlists fall back to two columns with wrapping, and finally to a second page.
 */
function useOnePageLayout(page: React.RefObject<HTMLElement | null>, key: string): Layout {
  const [layout, setLayout] = useState<Layout>({ columns: 1, fontPt: MAX_FONT_PT })

  useLayoutEffect(() => {
    const pageEl = page.current
    const bodyEl = pageEl?.querySelector<HTMLElement>('.setlist-sheet-body')
    if (!pageEl || !bodyEl) return
    const apply = (candidate: Layout): void => {
      pageEl.style.fontSize = `${candidate.fontPt * PT}px`
      bodyEl.style.columnCount = String(candidate.columns)
    }
    const fitsHeight = (): boolean => {
      const style = getComputedStyle(pageEl)
      return pageEl.scrollHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom) <= PAGE_HEIGHT_PX
    }
    const wraps = (): boolean => {
      const lineHeight = parseFloat(getComputedStyle(bodyEl).lineHeight)
      return [...bodyEl.querySelectorAll('li')].some((li) => li.offsetHeight > lineHeight * 1.5)
    }

    const sizes: number[] = []
    for (let pt = MAX_FONT_PT; pt >= MIN_FONT_PT; pt--) sizes.push(pt)
    const tryLayout = (candidate: Layout, allowWrap: boolean): boolean => {
      apply(candidate)
      return fitsHeight() && (allowWrap || candidate.columns === 1 || !wraps())
    }
    const chosen =
      sizes.flatMap((fontPt): Layout[] => [{ columns: 1, fontPt }, { columns: 2, fontPt }]).find((c) => tryLayout(c, false)) ??
      sizes.map((fontPt): Layout => ({ columns: 2, fontPt })).find((c) => tryLayout(c, true)) ?? { columns: 2, fontPt: MIN_FONT_PT }
    // Leave the measured style in place: it equals what React renders for the chosen layout.
    apply(chosen)
    setLayout(chosen)
  }, [page, key])

  return layout
}

interface SetlistPrintProps {
  setlistId: number
  withSongs: boolean
  onPrintRequested: () => void
  onClose: () => void
}

export function SetlistPrint({ setlistId, withSongs, onPrintRequested, onClose }: SetlistPrintProps): React.JSX.Element {
  const [data, setData] = useState<SetlistPrintData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const pageRef = useRef<HTMLElement>(null)
  const printed = useRef(false)
  const printRequested = useRef(onPrintRequested)
  printRequested.current = onPrintRequested

  useEffect(() => {
    let cancelled = false
    unwrap(window.api.setlists.getForPrint(setlistId))
      .then((loaded) => {
        if (cancelled) return
        if (loaded) setData(loaded)
        else setError('The setlist no longer exists.')
      })
      .catch((e) => {
        if (!cancelled) setError(errorMessage(e))
      })
    return () => {
      cancelled = true
    }
  }, [setlistId])

  useEffect(() => {
    rootRef.current?.focus()
  }, [])

  const layoutKey = data ? JSON.stringify(data.sets.map((set) => set.map((s) => s.title))) : ''
  const layout = useOnePageLayout(pageRef, layoutKey)

  // Print once, after the layout has settled.
  useEffect(() => {
    if (!data || printed.current) return
    printed.current = true
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => printRequested.current()))
    return () => cancelAnimationFrame(frame)
  }, [data])

  const songCount = data?.sets.reduce((n, set) => n + set.length, 0) ?? 0

  return (
    <div className="preview" ref={rootRef} tabIndex={-1} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <header className="preview-header">
        <h2>{withSongs ? 'Print setlist with songs' : 'Print setlist'}</h2>
        <div className="editor-header-actions">
          <button type="button" className="primary" onClick={onPrintRequested} disabled={!data}>
            Print...
          </button>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </header>
      {error && (
        <p className="banner error" role="alert">
          {error}
        </p>
      )}
      <div className="preview-scroll">
        {data && (
          <div className="print-stack">
            <article className="sheet setlist-sheet" ref={pageRef} style={{ fontSize: `${layout.fontPt * PT}px` }}>
              <h1 className="setlist-sheet-title">Setlist</h1>
              <div className="setlist-sheet-body" style={{ columnCount: layout.columns }}>
                {data.sets.map((set, index) => (
                  <section key={index} className="setlist-sheet-set">
                    <h2>Set {index + 1}</h2>
                    <ul>
                      {set.map((song, songIndex) => (
                        <li key={songIndex}>{song.title}</li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </article>
            {withSongs &&
              data.sets.flatMap((set, setIndex) =>
                set.map((song, songIndex) => (
                  <div key={`${setIndex}-${songIndex}`} className="setlist-song-page">
                    <div className="setlist-song-set">Set {setIndex + 1}</div>
                    <SongSheet song={song} />
                  </div>
                ))
              )}
          </div>
        )}
      </div>
      {data && (
        <p className="statusbar setlist-print-status">
          {layout.columns === 2 ? 'Two columns' : 'One column'}, {layout.fontPt} pt
          {withSongs ? ` · setlist page plus ${songCount} song ${songCount === 1 ? 'page' : 'pages'}` : ''}
        </p>
      )}
    </div>
  )
}
