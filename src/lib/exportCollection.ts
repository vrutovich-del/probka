import { currentAccount } from '../account/account';
import { db } from '../db/db';

/**
 * "Export my collection" (screen 33). One JSON file with every cap exactly as the garage holds it,
 * each with its garage tile inlined, so the file opens on its own and shows what the collection was.
 *
 * The full-size photographs are deliberately not in it: a camera original is megabytes, and fifty
 * caps would be a file a phone cannot build in memory, let alone hand to anyone. They are on the
 * phone and, once an account exists, on the server.
 */

const FILE_VERSION = 1;

interface ExportedCap {
  id: string;
  createdAt: number;
  foundOn: string;
  place: string;
  condition: string;
  brand: string | null;
  product: string;
  shape: string | null;
  country: string | null;
  dupes: number;
  photos: { role: string; width: number; height: number; hasCutout: boolean }[];
  /** The 256 px garage tile as a data URL, or null for a cap that never got one. */
  tile: string | null;
}

export async function buildExport(): Promise<Blob> {
  const account = currentAccount();
  const caps = await db.caps.orderBy('createdAt').toArray();
  const photos = await db.photos.toArray();
  const thumbs = await db.thumbs.toArray();
  const tiles = new Map(await Promise.all(thumbs.map(async (t) => [t.capId, await toDataUrl(t.blob)] as const)));

  const exported: ExportedCap[] = caps.map((cap) => ({
    id: cap.id,
    createdAt: cap.createdAt,
    foundOn: cap.foundOn,
    place: cap.place,
    condition: cap.condition,
    brand: cap.brand,
    product: cap.product,
    shape: cap.shape,
    country: cap.country,
    dupes: cap.dupes,
    photos: photos
      .filter((p) => p.capId === cap.id)
      .map((p) => ({ role: p.role, width: p.width, height: p.height, hasCutout: p.cutout !== null })),
    tile: tiles.get(cap.id) ?? null,
  }));

  const file = {
    app: 'cap-garage',
    version: FILE_VERSION,
    exportedAt: new Date().toISOString(),
    account: account ? { nickname: account.nickname, friendCode: account.friendCode } : null,
    caps: exported,
  };
  return new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
}

/** Builds the file and hands it to the browser to save. */
export async function exportCollection(): Promise<void> {
  const blob = await buildExport();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `cap-garage-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  // Long enough for the browser to have taken the blob; revoking at once cancels the save on Safari.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function toDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the tile'));
    reader.readAsDataURL(blob);
  });
}
