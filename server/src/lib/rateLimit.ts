/**
 * A fixed-window counter in the isolate's memory.
 *
 * It is deliberately the cheap kind: no D1 write, no extra service, nothing to pay for. A Worker runs
 * in many isolates, so the real limit is "this many per window per isolate" — enough to stop a flood
 * from a phone or a script, not enough to stop a distributed one. Anything that must not be guessable
 * even once — entering a friend's code — is counted in D1 against the account instead, where the count
 * survives an isolate being recycled.
 */

interface Window {
  count: number;
  resetAt: number;
}

const windows = new Map<string, Window>();

/** Forget windows that have expired; keeps a long-lived isolate from growing a map of dead keys. */
function prune(nowMs: number): void {
  for (const [key, window] of windows) if (window.resetAt <= nowMs) windows.delete(key);
}

/**
 * Counts one hit against `key`. Returns false when the caller is over the limit, which is the
 * moment to answer 429 without doing any work.
 */
export function allow(key: string, limit: number, windowMs: number): boolean {
  const nowMs = Date.now();
  if (windows.size > 5000) prune(nowMs);
  const window = windows.get(key);
  if (!window || window.resetAt <= nowMs) {
    windows.set(key, { count: 1, resetAt: nowMs + windowMs });
    return true;
  }
  window.count += 1;
  return window.count <= limit;
}

/** Seconds a caller should wait, for the `Retry-After` header. */
export function retryAfter(key: string): number {
  const window = windows.get(key);
  if (!window) return 1;
  return Math.max(1, Math.ceil((window.resetAt - Date.now()) / 1000));
}

/** Who is calling, as far as Cloudflare knows. Unknown callers share one bucket, which is the safe default. */
export function callerKey(request: Request): string {
  return request.headers.get('cf-connecting-ip') ?? 'unknown';
}
