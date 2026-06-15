/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Absolute base URL of the NestJS API, e.g. https://api.domar.example */
  readonly VITE_API_BASE?: string;
  /** "true" enables push registration (requires a configured Firebase project). */
  readonly VITE_PUSH_ENABLED?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
