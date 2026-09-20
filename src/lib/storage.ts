/**
 * The garage is the only copy of a cap in Phase 1: there is no account and no server to fetch it back
 * from. So the app asks the browser to keep its storage, and says plainly when the phone is full
 * instead of losing a find quietly.
 */

/** Asks for storage the browser will not evict on its own. Safe to call on every launch. */
export async function requestPersistentStorage(): Promise<void> {
  if (!navigator.storage?.persist) return;
  try {
    if (await navigator.storage.persisted()) return;
    const granted = await navigator.storage.persist();
    // Chrome decides from how much the app is used, so a "no" today can become a "yes" later.
    if (!granted) console.info('Storage is not persistent yet; the browser may still evict the garage.');
  } catch (error) {
    console.warn('Could not ask for persistent storage', error);
  }
}

/**
 * True when a write failed because the phone is out of room. Dexie wraps the DOMException, so the
 * name is checked down the `cause`/`inner` chain rather than on the top error alone.
 */
export function isStorageFull(error: unknown): boolean {
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (current && typeof current === 'object' && !seen.has(current)) {
    seen.add(current);
    const { name, inner, cause } = current as { name?: unknown; inner?: unknown; cause?: unknown };
    if (name === 'QuotaExceededError' || name === 'NS_ERROR_FILE_NO_DEVICE_SPACE') return true;
    current = inner ?? cause;
  }
  return false;
}
