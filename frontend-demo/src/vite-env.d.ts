/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_PUSHER_APP_KEY: string
  readonly VITE_PUSHER_APP_CLUSTER: string
  readonly VITE_PUSHER_APP_HOST: string
  readonly VITE_PUSHER_APP_PORT: number
  readonly VITE_PUSHER_APP_SCHEME: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
