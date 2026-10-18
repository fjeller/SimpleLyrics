import { useEffect, useState } from 'react'
import type { RecentFile } from '../../../shared/types'
import { unwrap } from '../api'

interface WelcomeScreenProps {
  onNew: () => void
  onOpen: () => void
  onOpenRecent: (path: string) => void
}

export function WelcomeScreen({ onNew, onOpen, onOpenRecent }: WelcomeScreenProps): React.JSX.Element {
  const [recent, setRecent] = useState<RecentFile[]>([])

  useEffect(() => {
    unwrap(window.api.file.getRecent())
      .then(setRecent)
      .catch(() => setRecent([]))
  }, [])

  return (
    <main className="welcome">
      <h1>SimpleLyrics</h1>
      <p>Create a new song file or open an existing one.</p>
      <div className="welcome-actions">
        <button type="button" className="primary" onClick={onNew}>
          New file...
        </button>
        <button type="button" onClick={onOpen}>
          Open file...
        </button>
      </div>
      {recent.length > 0 && (
        <section aria-label="Recent files">
          <h2>Recent</h2>
          <ul className="recent-list">
            {recent.map((file) => (
              <li key={file.path}>
                <button type="button" className="link" disabled={!file.exists} onClick={() => onOpenRecent(file.path)}>
                  <span className="recent-name">{file.name}</span>
                  <span className="recent-path">{file.exists ? file.path : `${file.path} (missing)`}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}
