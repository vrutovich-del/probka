/**
 * Where the server is, and the one way to reach it.
 *
 * The address comes from `VITE_API_URL` at build time. A build without one — every build until the
 * Worker is deployed, and every `npm run dev` — leaves it null, and the app stays exactly the
 * offline, account-less Phase 1 app: `hasServer()` is false and nothing here is called.
 */

const configured = (import.meta.env.VITE_API_URL ?? '').trim().replace(/\/+$/, '');

/** The Worker's origin without a trailing slash, or null when this build has no server. */
export const API_URL: string | null = configured || null;

/** Whether this build has a server to talk to. Every caller has to cope with false. */
export function hasServer(): boolean {
  return API_URL !== null;
}

/**
 * `fetch` against the API. `path` starts with `/api/`. Throws when the build has no server,
 * so call it behind `hasServer()`.
 */
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  if (!API_URL) throw new Error(`No server in this build: VITE_API_URL was not set (${path}).`);
  return fetch(`${API_URL}${path}`, init);
}
