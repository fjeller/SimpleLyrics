import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import CreatableSelect from 'react-select/creatable'
import type { Theme as SelectTheme } from 'react-select'
import { LIMITS } from '../../../shared/types'
import type { CategoryList, InterpreterList, SongInput } from '../../../shared/types'
import { errorMessage, unwrap } from '../api'
import { ConfirmDialog } from './Dialogs'

interface Option {
  value: string
  label: string
  /** Set for entries that already exist in the database. */
  id?: number
}

interface FormState {
  title: string
  key: string
  originalKey: string
  capo: string
  category: Option | null
  interpreters: Option[]
  firstLine: string
  chords: string
  songText: string
}

interface SongEditorProps {
  /** null creates a new song. */
  songId: number | null
  categories: CategoryList | null
  interpreters: InterpreterList | null
  onClose: () => void
  /** Called after saving so the parent can reload its lists. */
  onChanged: () => void
}

const emptyForm: FormState = {
  title: '',
  key: '',
  originalKey: '',
  capo: '0',
  category: null,
  interpreters: [],
  firstLine: '',
  chords: '',
  songText: ''
}

const selectTheme = (theme: SelectTheme): SelectTheme => ({
  ...theme,
  borderRadius: 4,
  colors: {
    ...theme.colors,
    primary: 'var(--accent)',
    primary75: 'var(--accent)',
    primary50: 'var(--hover)',
    primary25: 'var(--hover)',
    neutral0: 'var(--surface)',
    neutral5: 'var(--surface-alt)',
    neutral10: 'var(--chip-bg)',
    neutral20: 'var(--border)',
    neutral30: 'var(--border-strong)',
    neutral40: 'var(--text-muted)',
    neutral50: 'var(--text-muted)',
    neutral60: 'var(--text-muted)',
    neutral70: 'var(--text)',
    neutral80: 'var(--text)',
    neutral90: 'var(--text)'
  }
})

const sameName = (a: string, b: string): boolean => a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase()

export function SongEditor({ songId, categories, interpreters, onClose, onChanged }: SongEditorProps): React.JSX.Element {
  const [form, setForm] = useState<FormState>(emptyForm)
  const [initial, setInitial] = useState<FormState>(emptyForm)
  const [loading, setLoading] = useState(songId !== null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState<'discard' | null>(null)
  const titleRef = useRef<HTMLInputElement>(null)

  const categoryOptions = useMemo<Option[]>(
    () => (categories?.items ?? []).map((c) => ({ value: `id:${c.id}`, label: c.name, id: c.id })),
    [categories]
  )
  const interpreterOptions = useMemo<Option[]>(
    () => (interpreters?.items ?? []).map((i) => ({ value: `id:${i.id}`, label: i.name, id: i.id })),
    [interpreters]
  )

  useEffect(() => {
    if (songId === null) {
      titleRef.current?.focus()
      return
    }
    let cancelled = false
    unwrap(window.api.songs.get(songId))
      .then((song) => {
        if (cancelled) return
        if (!song) {
          setError('The song no longer exists.')
          setLoading(false)
          return
        }
        const category = categories?.items.find((c) => c.id === song.categoryId)
        const loaded: FormState = {
          title: song.title,
          key: song.key ?? '',
          originalKey: song.originalKey ?? '',
          capo: String(song.capo),
          category: category ? { value: `id:${category.id}`, label: category.name, id: category.id } : null,
          interpreters: song.interpreters.map((i) => ({ value: `id:${i.id}`, label: i.name, id: i.id })),
          firstLine: song.firstLine ?? '',
          chords: song.chords ?? '',
          songText: song.songText ?? ''
        }
        setForm(loaded)
        setInitial(loaded)
        setLoading(false)
        titleRef.current?.focus()
      })
      .catch((e) => {
        if (cancelled) return
        setError(errorMessage(e))
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // The song is loaded once per editor instance; category names come from the first available list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songId])

  const dirty = JSON.stringify(form) !== JSON.stringify(initial)

  function update<K extends keyof FormState>(key: K, value: FormState[K]): void {
    setForm((f) => ({ ...f, [key]: value }))
    setError(null)
  }

  function createCategory(name: string): void {
    const existing = categoryOptions.find((o) => sameName(o.label, name))
    update('category', existing ?? { value: `new:${name.trim()}`, label: name.trim() })
  }

  function createInterpreter(name: string): void {
    const trimmed = name.trim()
    if (form.interpreters.some((o) => sameName(o.label, trimmed))) return
    const existing = interpreterOptions.find((o) => sameName(o.label, trimmed))
    update('interpreters', [...form.interpreters, existing ?? { value: `new:${trimmed}`, label: trimmed }])
  }

  function buildInput(): SongInput | null {
    const capoText = form.capo.trim()
    const capo = capoText === '' ? 0 : Number(capoText)
    if (!Number.isInteger(capo) || capo < 0 || capo > LIMITS.capoMax) {
      setError('Capo must be a whole number between 0 and 12.')
      return null
    }
    if (!form.title.trim()) {
      setError('The title is required.')
      titleRef.current?.focus()
      return null
    }
    return {
      title: form.title,
      key: form.key,
      originalKey: form.originalKey,
      firstLine: form.firstLine,
      capo,
      songText: form.songText,
      chords: form.chords,
      categoryId: form.category?.id ?? null,
      newCategoryName: form.category && form.category.id === undefined ? form.category.label : null,
      interpreterIds: form.interpreters.flatMap((o) => (o.id !== undefined ? [o.id] : [])),
      newInterpreterNames: form.interpreters.flatMap((o) => (o.id === undefined ? [o.label] : []))
    }
  }

  async function save(event?: FormEvent): Promise<void> {
    event?.preventDefault()
    const input = buildInput()
    if (!input) return
    setSaving(true)
    try {
      if (songId === null) await unwrap(window.api.songs.create(input))
      else await unwrap(window.api.songs.update(songId, input))
      onChanged()
      onClose()
    } catch (e) {
      setError(errorMessage(e))
      setSaving(false)
    }
  }

  function requestClose(): void {
    if (dirty) setConfirm('discard')
    else onClose()
  }

  return (
    <form
      className="editor"
      onSubmit={(e) => void save(e)}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && !e.defaultPrevented && !confirm) requestClose()
      }}
    >
      <header className="editor-header">
        <h1>{songId === null ? 'New song' : 'Edit song'}</h1>
        <div className="editor-header-actions">
          <button type="button" onClick={requestClose}>
            Cancel
          </button>
          <button type="submit" className="primary" disabled={saving || loading}>
            Save
          </button>
        </div>
      </header>

      {error && (
        <p className="banner error" role="alert">
          {error}
        </p>
      )}

      <div className="editor-body" aria-busy={loading}>
        <div className="form-grid">
          <label className="field span-3">
            <span>Title *</span>
            <input ref={titleRef} type="text" value={form.title} maxLength={LIMITS.title} disabled={loading} onChange={(e) => update('title', e.target.value)} />
          </label>

          <label className="field">
            <span>Key</span>
            <input type="text" value={form.key} maxLength={LIMITS.key} disabled={loading} onChange={(e) => update('key', e.target.value)} />
          </label>
          <label className="field">
            <span>Original key</span>
            <input type="text" value={form.originalKey} maxLength={LIMITS.key} disabled={loading} onChange={(e) => update('originalKey', e.target.value)} />
          </label>
          <label className="field">
            <span>Capo</span>
            <input type="number" min={0} max={LIMITS.capoMax} step={1} value={form.capo} disabled={loading} onChange={(e) => update('capo', e.target.value)} />
          </label>

          <div className="field">
            <span id="category-label">Category</span>
            <CreatableSelect<Option, false>
              aria-labelledby="category-label"
              classNamePrefix="rs"
              theme={selectTheme}
              isClearable
              isDisabled={loading}
              options={categoryOptions}
              value={form.category}
              placeholder="None - type to choose or create"
              formatCreateLabel={(input) => `Create category "${input}"`}
              onChange={(option) => update('category', option)}
              onCreateOption={createCategory}
            />
          </div>

          <div className="field span-2">
            <span id="interpreters-label">Interpreters</span>
            <CreatableSelect<Option, true>
              aria-labelledby="interpreters-label"
              classNamePrefix="rs"
              theme={selectTheme}
              isMulti
              isDisabled={loading}
              options={interpreterOptions}
              value={form.interpreters}
              placeholder="None - type to choose or create"
              formatCreateLabel={(input) => `Create interpreter "${input}"`}
              onChange={(options) => update('interpreters', [...options])}
              onCreateOption={createInterpreter}
            />
          </div>

          <label className="field span-3">
            <span>
              First line <small>{form.firstLine.length}/{LIMITS.firstLine}</small>
            </span>
            <input type="text" value={form.firstLine} maxLength={LIMITS.firstLine} disabled={loading} onChange={(e) => update('firstLine', e.target.value)} />
          </label>

          <label className="field span-3">
            <span>
              Chords used <small>{form.chords.length}/{LIMITS.chords}</small>
            </span>
            <textarea className="chords-text" rows={3} value={form.chords} maxLength={LIMITS.chords} disabled={loading} onChange={(e) => update('chords', e.target.value)} />
          </label>

          <label className="field span-3 grow">
            <span>Song text</span>
            <textarea className="song-text" value={form.songText} disabled={loading} onChange={(e) => update('songText', e.target.value)} />
          </label>
        </div>
      </div>

      {confirm === 'discard' && (
        <ConfirmDialog title="Discard changes?" message="Your changes to this song have not been saved." confirmLabel="Discard" danger onConfirm={onClose} onCancel={() => setConfirm(null)} />
      )}
    </form>
  )
}
