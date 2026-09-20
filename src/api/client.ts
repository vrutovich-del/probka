/**
 * Where the server is, and the one way to reach it.
 *
 * The address comes from `VITE_API_URL` at build time. A build without one leaves it null, and the
 * app stays exactly the offline, account-less Phase 1 app: `hasServer()` is false and nothing here
 * is called. Every failure is a value, not an exception — the phone is offline more often than not,
 * and the screens have to say so calmly rather than crash.
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

export interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Sent as JSON. */
  body?: unknown;
  /** The device token, for routes that act for an account. */
  token?: string | null;
  signal?: AbortSignal;
}

/**
 * `status: 0` with `error: 'offline'` is every reason the request never reached the Worker —
 * no network, DNS, a cancelled fetch. The Worker's own errors keep their status and its
 * `{"error":"…"}` word, which is what the screens switch on.
 */
export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

export async function apiJson<T>(path: string, options: ApiOptions = {}): Promise<ApiResult<T>> {
  if (!API_URL) return { ok: false, status: 0, error: 'no_server' };
  const { method = 'GET', body, token, signal } = options;
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch {
    return { ok: false, status: 0, error: 'offline' };
  }

  const text = await response.text().catch(() => '');
  let parsed: unknown = undefined;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = undefined;
    }
  }
  if (!response.ok) {
    const error = typeof parsed === 'object' && parsed !== null && 'error' in parsed ? String(parsed.error) : 'server';
    return { ok: false, status: response.status, error };
  }
  return { ok: true, data: parsed as T };
}
