import { forwardRef } from 'react'
import { MIN_SEARCH_LENGTH } from '../../../shared/types'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
}

export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(function SearchBar({ value, onChange }, ref) {
  return (
    <div className="search">
      <input
        ref={ref}
        type="search"
        value={value}
        placeholder={`Search title or first line (from ${MIN_SEARCH_LENGTH} characters)`}
        aria-label="Search songs"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onChange('')
        }}
      />
    </div>
  )
})
