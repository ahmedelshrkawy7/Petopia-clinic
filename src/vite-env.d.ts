/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** API origin when it isn't served from the same host (dev uses the Vite /api proxy). */
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
