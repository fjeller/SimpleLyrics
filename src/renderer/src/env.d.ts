/// <reference types="vite/client" />

import type { SimpleLyricsApi } from '../../shared/types'

declare global {
  interface Window {
    api: SimpleLyricsApi
  }
}

export {}
