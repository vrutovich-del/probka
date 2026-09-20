/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** The Worker's address, set by the deploy workflow from the repository variable API_URL. Absent in dev. */
  readonly VITE_API_URL?: string;
}
