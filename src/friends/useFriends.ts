import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { fetchFriends, friendPhotoUrl, type FriendsPage } from './api';

/**
 * The friends tab's data, fetched when it opens. There is no cache and no polling: a request from
 * another child arrives when the tab is opened again, which is what a list of five friends needs.
 */

export interface FriendsData {
  page: FriendsPage | undefined;
  loading: boolean;
  /** True when the last attempt failed — offline, or the server said no. */
  failed: boolean;
  reload: () => void;
}

export function useFriends(enabled: boolean): FriendsData {
  const [page, setPage] = useState<FriendsPage>();
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let live = true;
    setLoading(true);
    void fetchFriends().then((result) => {
      if (!live) return;
      setLoading(false);
      if (result.ok) {
        setPage(result.data);
        setFailed(false);
      } else {
        setFailed(true);
      }
    });
    return () => {
      live = false;
    };
  }, [enabled, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { page, loading, failed, reload };
}

/** One friend's cap picture, once it has been fetched and turned into an object URL. */
export function useFriendPhoto(photoId: string | undefined, variant: 'thumb' | 'cutout'): string | undefined {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!photoId) return;
    let live = true;
    void friendPhotoUrl(photoId, variant).then((next) => {
      if (live && next) setUrl(next);
    });
    return () => {
      live = false;
    };
  }, [photoId, variant]);
  return url;
}

/**
 * The parental gate in front of the friends tab, remembered for as long as the app is open and no
 * longer — the prototype holds it in the same way, and "a parent is here" is not a thing to store.
 */
let gatePassed = false;
const listeners = new Set<() => void>();

export function passFriendsGate(): void {
  gatePassed = true;
  for (const fn of listeners) fn();
}

export function useFriendsGate(): boolean {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => gatePassed,
  );
}
