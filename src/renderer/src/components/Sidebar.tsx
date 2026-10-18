import type { CategoryList, InterpreterList } from '../../../shared/types'

export type SidebarTab = 'categories' | 'interpreters'

/** `id: null` is the virtual "(No category)" / "(No interpreter)" entry. */
export type Selection = { kind: 'all' } | { kind: 'item'; id: number | null }

interface SidebarProps {
  tab: SidebarTab
  onTabChange: (tab: SidebarTab) => void
  categories: CategoryList | null
  interpreters: InterpreterList | null
  selection: Selection
  /** True while a search overrides the selection. */
  dimmed: boolean
  onSelect: (selection: Selection) => void
  onAdd: () => void
  onRename: (id: number, name: string) => void
  onDelete: (id: number, name: string) => void
}

interface Entry {
  key: string
  label: string
  count: number
  selection: Selection
  virtual: boolean
  id: number | null
}

function buildEntries(tab: SidebarTab, categories: CategoryList | null, interpreters: InterpreterList | null): Entry[] {
  const isCategories = tab === 'categories'
  const list = isCategories ? categories : interpreters
  if (!list) return []
  const virtualCount = isCategories ? (list as CategoryList).uncategorizedSongs : (list as InterpreterList).withoutInterpreterSongs
  return [
    { key: 'all', label: 'All songs', count: list.totalSongs, selection: { kind: 'all' }, virtual: true, id: null },
    {
      key: 'none',
      label: isCategories ? '(No category)' : '(No interpreter)',
      count: virtualCount,
      selection: { kind: 'item', id: null },
      virtual: true,
      id: null
    },
    ...list.items.map(
      (item): Entry => ({
        key: String(item.id),
        label: item.name,
        count: item.songCount,
        selection: { kind: 'item', id: item.id },
        virtual: false,
        id: item.id
      })
    )
  ]
}

function isSelected(entry: Entry, selection: Selection): boolean {
  if (entry.selection.kind === 'all') return selection.kind === 'all'
  return selection.kind === 'item' && selection.id === entry.selection.id
}

export function Sidebar({ tab, onTabChange, categories, interpreters, selection, dimmed, onSelect, onAdd, onRename, onDelete }: SidebarProps): React.JSX.Element {
  const entries = buildEntries(tab, categories, interpreters)
  const selectedEntry = entries.find((e) => isSelected(e, selection))
  const editable = selectedEntry && !selectedEntry.virtual && selectedEntry.id !== null ? selectedEntry : undefined
  const noun = tab === 'categories' ? 'category' : 'interpreter'

  return (
    <aside className="sidebar" aria-label="Filter">
      <div className="tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'categories'} onClick={() => onTabChange('categories')}>
          Categories
        </button>
        <button type="button" role="tab" aria-selected={tab === 'interpreters'} onClick={() => onTabChange('interpreters')}>
          Interpreters
        </button>
      </div>

      <ul className={`entry-list${dimmed ? ' dimmed' : ''}`}>
        {entries.map((entry) => (
          <li key={entry.key}>
            <button
              type="button"
              className={`entry${entry.virtual ? ' virtual' : ''}`}
              aria-current={isSelected(entry, selection) ? 'true' : undefined}
              onClick={() => onSelect(entry.selection)}
            >
              <span className="entry-label">{entry.label}</span>
              <span className="entry-count">{entry.count}</span>
            </button>
          </li>
        ))}
      </ul>

      <div className="sidebar-actions">
        <button type="button" onClick={onAdd} title={`Add ${noun}`}>
          Add
        </button>
        <button type="button" disabled={!editable} onClick={() => editable && onRename(editable.id!, editable.label)} title={`Rename selected ${noun}`}>
          Rename
        </button>
        <button type="button" className="danger-outline" disabled={!editable} onClick={() => editable && onDelete(editable.id!, editable.label)} title={`Delete selected ${noun}`}>
          Delete
        </button>
      </div>
    </aside>
  )
}
