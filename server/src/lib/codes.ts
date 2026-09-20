/**
 * Ids, codes and the hashes they are stored as.
 *
 * One alphabet for everything a child reads off a screen and types on another phone: no 0/O, no 1/I,
 * upper case only. A friend code is six of those characters (`K7M-4QZ`, the prototype's shape), a
 * recovery code sixteen — 80 bits, which no one guesses, and which the parent keeps on paper.
 */

const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/** Draws `length` characters with a uniform distribution — the modulo bias of `% 32` is zero here, 256/32 = 8. */
function draw(length: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let out = '';
  for (const byte of bytes) out += ALPHABET[byte % ALPHABET.length];
  return out;
}

/** `K7M-4QZ`. 32^6 ≈ 1.07e9 codes, which is why entering one is rate-limited. */
export function newFriendCode(): string {
  const raw = draw(6);
  return `${raw.slice(0, 3)}-${raw.slice(3)}`;
}

/** `ABCD-EFGH-JKLM-NPQR`. Shown once, at account creation, for the parent to keep. */
export function newRecoveryCode(): string {
  const raw = draw(16);
  return [0, 4, 8, 12].map((i) => raw.slice(i, i + 4)).join('-');
}

/** What the child typed, as the database holds it: upper case, other characters dropped. */
export function normalizeCode(input: string): string {
  const kept = input.toUpperCase().replace(/[^0-9A-Z]/g, '');
  return kept;
}

/** A friend code typed on another phone, back in `ABC-DEF` shape, or null if it cannot be one. */
export function parseFriendCode(input: string): string | null {
  const raw = normalizeCode(input);
  if (raw.length !== 6) return null;
  if ([...raw].some((ch) => !ALPHABET.includes(ch))) return null;
  return `${raw.slice(0, 3)}-${raw.slice(3)}`;
}

/** A recovery or transfer code typed on a new phone, in groups of four, or null. */
export function parseLongCode(input: string): string | null {
  const raw = normalizeCode(input);
  if (raw.length !== 16) return null;
  if ([...raw].some((ch) => !ALPHABET.includes(ch))) return null;
  return [0, 4, 8, 12].map((i) => raw.slice(i, i + 4)).join('-');
}

/** An opaque account id. Not shown to anyone: the code is what a child reads out. */
export function newAccountId(): string {
  return crypto.randomUUID();
}

/** 32 random bytes as base64url — the bearer a phone keeps until it is signed out or the account is gone. */
export function newDeviceToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** SHA-256, hex. Tokens and recovery codes are stored only like this. */
export async function hash(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
