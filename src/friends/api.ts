import { deviceToken } from '../account/account';
import { apiFetch, apiJson, type ApiResult } from '../api/client';
import type { AvatarKey } from '../account/avatars';
import type { CapShape, Condition } from '../db/db';

/** A friend, or the child at the other end of a request: a nickname and a shape, nothing more. */
export interface Person {
  id: string;
  nickname: string;
  avatar: AvatarKey;
}

/** What a friend's caps amount to — enough to count caps, brands and badges with the app's own code. */
export interface FriendCapSummary {
  brand: string | null;
  product: string;
  createdAt: number;
  dupes: number;
}

export interface Friend extends Person {
  caps: FriendCapSummary[];
}

export interface FriendRequest {
  id: string;
  createdAt: number;
  person: Person;
}

export interface FriendsPage {
  friends: Friend[];
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
}

/** One cap in a friend's garage. No place and no found-on date: the server does not send them. */
export interface FriendCap {
  id: string;
  createdAt: number;
  brand: string | null;
  product: string;
  shape: CapShape | null;
  country: string | null;
  condition: Condition;
  dupes: number;
  useCutout: boolean;
  photos: { id: string; role: 'top' | 'side'; hasCutout: boolean; hasThumb: boolean }[];
}

export interface FriendGarage {
  person: Person;
  caps: FriendCap[];
}

export function fetchFriends(): Promise<ApiResult<FriendsPage>> {
  return apiJson<FriendsPage>('/api/friends', { token: deviceToken() });
}

export type SendCodeOutcome =
  | { ok: true; status: 'sent' | 'friends'; person: Person }
  | { ok: false; error: SendCodeError };

export type SendCodeError =
  | 'invalid_code'
  | 'own_code'
  | 'unknown_code'
  | 'already_friends'
  | 'already_sent'
  | 'rate_limited'
  | 'offline'
  | 'server';

export async function sendCode(code: string): Promise<SendCodeOutcome> {
  const result = await apiJson<{ status: 'sent' | 'friends'; person: Person }>('/api/friends/requests', {
    method: 'POST',
    token: deviceToken(),
    body: { code },
  });
  if (result.ok) return { ok: true, status: result.data.status, person: result.data.person };
  const known: SendCodeError[] = [
    'invalid_code',
    'own_code',
    'unknown_code',
    'already_friends',
    'already_sent',
    'rate_limited',
  ];
  const error = known.find((e) => e === result.error) ?? (result.status === 0 ? 'offline' : 'server');
  return { ok: false, error };
}

export function acceptRequest(id: string): Promise<ApiResult<unknown>> {
  return apiJson(`/api/friends/requests/${id}/accept`, { method: 'POST', token: deviceToken() });
}

export function declineRequest(id: string): Promise<ApiResult<unknown>> {
  return apiJson(`/api/friends/requests/${id}`, { method: 'DELETE', token: deviceToken() });
}

export function fetchFriendGarage(friendId: string): Promise<ApiResult<FriendGarage>> {
  return apiJson<FriendGarage>(`/api/friends/${friendId}/caps`, { token: deviceToken() });
}

/**
 * A friend's cap picture. It needs the bearer token, so it cannot be an `<img src>` — it is fetched,
 * turned into an object URL and kept. The cache is small and oldest-first: a garage of a few hundred
 * tiles must not grow into a few hundred megabytes of blobs.
 */
const MAX_CACHED = 150;
const urls = new Map<string, Promise<string | null>>();

export function friendPhotoUrl(photoId: string, variant: 'thumb' | 'cutout'): Promise<string | null> {
  const key = `${photoId}/${variant}`;
  const known = urls.get(key);
  if (known) return known;
  const pending = load(key);
  urls.set(key, pending);
  if (urls.size > MAX_CACHED) {
    const oldest = urls.keys().next().value;
    if (oldest !== undefined) {
      const stale = urls.get(oldest);
      urls.delete(oldest);
      void stale?.then((url) => url && URL.revokeObjectURL(url));
    }
  }
  return pending;
}

async function load(key: string): Promise<string | null> {
  const token = deviceToken();
  if (!token) return null;
  try {
    const response = await apiFetch(`/api/photos/${key}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) return null;
    return URL.createObjectURL(await response.blob());
  } catch {
    return null;
  }
}
