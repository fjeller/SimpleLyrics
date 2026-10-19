import { TAB_MAX_COLS } from '../../../shared/tabs'
import type { Tab, TabRow, TabToken } from '../../../shared/tabs'

const CELL = 12
const LEFT = 22
const TOP = 15
const GAP = 15
const PAD_RIGHT = 6
const MAX_WIDTH = LEFT + TAB_MAX_COLS * CELL + PAD_RIGHT

function Token({ token, y }: { token: TabToken; y: number }): React.JSX.Element {
  if (token.kind === 'fret') {
    const x = LEFT + token.col * CELL
    return (
      <>
        <rect className="tab-knockout" x={x} y={y - 7} width={token.width * CELL} height={14} />
        <text className="tab-note" x={x + (token.width * CELL) / 2} y={y} fontSize={13} fontWeight={600}>
          {token.value}
        </text>
      </>
    )
  }

  const centre = LEFT + (token.col + 0.5) * CELL
  if (token.symbol === '/' || token.symbol === '\\') {
    const up = token.symbol === '/'
    return <line x1={centre - CELL / 2 - 1} x2={centre + CELL / 2 + 1} y1={y + (up ? 5 : -5)} y2={y + (up ? -5 : 5)} stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" />
  }

  const symbol = token.symbol.toLowerCase() === 'x' ? '\u00d7' : token.symbol
  return (
    <>
      <rect className="tab-knockout" x={centre - CELL / 2} y={y - 7} width={CELL} height={14} />
      <text className="tab-note" x={centre} y={y} fontSize={symbol === '\u00d7' ? 14 : 11} fontStyle="italic">
        {symbol}
      </text>
    </>
  )
}

function Row({ row }: { row: TabRow }): React.JSX.Element {
  const width = LEFT + row.cols * CELL + PAD_RIGHT
  const height = TOP * 2 + (row.strings.length - 1) * GAP
  const lineEnd = LEFT + row.cols * CELL
  const stringY = (index: number): number => TOP + index * GAP

  return (
    <svg className="tab-row" viewBox={`0 0 ${width} ${height}`} style={{ width: `${(width / MAX_WIDTH) * 100}%` }} role="img" aria-label={`Guitar tab, ${row.strings.length} strings`}>
      <g stroke="currentColor" strokeWidth={1}>
        {row.strings.map((_, i) => (
          <line key={i} x1={LEFT} x2={lineEnd} y1={stringY(i)} y2={stringY(i)} />
        ))}
        {row.bars.map((col) => (
          <line key={col} x1={LEFT + (col + 0.5) * CELL} x2={LEFT + (col + 0.5) * CELL} y1={stringY(0)} y2={stringY(row.strings.length - 1)} strokeWidth={1.4} />
        ))}
      </g>
      {row.strings.map((string, i) => (
        <g key={i}>
          {string.name && (
            <text className="tab-name" x={LEFT - 5} y={stringY(i)} fontSize={12}>
              {string.name}
            </text>
          )}
          {string.tokens.map((token, t) => (
            <Token key={t} token={token} y={stringY(i)} />
          ))}
        </g>
      ))}
    </svg>
  )
}

export function TabDiagram({ tab }: { tab: Tab }): React.JSX.Element {
  return (
    <div className="tab-diagram">
      {tab.rows.map((row, i) => (
        <Row key={i} row={row} />
      ))}
    </div>
  )
}
