/// <reference types="vite/client" />

// Typed env vars used by the app (Seam 1 selector). Extend as needed.
interface ImportMetaEnv {
  readonly VITE_DATA_SOURCE?: 'mock' | 'zerion'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
