import { useState } from 'react'
import type { FormEvent } from 'react'
import { LIMITS } from '../../../shared/types'
import { errorMessage } from '../api'
import { Modal } from './Dialogs'

interface NameEditDialogProps {
  title: string
  initialName: string
  submitLabel: string
  onSubmit: (name: string) => Promise<void>
  onCancel: () => void
}

export function NameEditDialog({ title, initialName, submitLabel, onSubmit, onCancel }: NameEditDialogProps): React.JSX.Element {
  const [name, setName] = useState(initialName)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (!name.trim()) {
      setError('The name must not be empty.')
      return
    }
    setBusy(true)
    try {
      await onSubmit(name.trim())
    } catch (e) {
      setError(errorMessage(e))
      setBusy(false)
    }
  }

  return (
    <Modal title={title} onClose={onCancel}>
      <form onSubmit={(e) => void handleSubmit(e)}>
        <input
          type="text"
          value={name}
          maxLength={LIMITS.name}
          autoFocus
          aria-label="Name"
          onChange={(e) => {
            setName(e.target.value)
            setError(null)
          }}
        />
        {error && <p className="field-error" role="alert">{error}</p>}
        <div className="modal-actions">
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="primary" disabled={busy}>
            {submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  )
}
