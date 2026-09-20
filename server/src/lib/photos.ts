/**
 * Where a photo's pixels live, and who may read them.
 *
 * The bucket has no public address: no custom domain, no public access. Every byte goes through
 * the Worker, which checks the bearer token first — so a key being guessed is not a way in, and a
 * link cannot be forwarded to someone who is not the owner or a friend.
 */

export const VARIANTS = ['original', 'cutout', 'thumb'] as const;
export type Variant = (typeof VARIANTS)[number];

export function isVariant(value: string): value is Variant {
  return (VARIANTS as readonly string[]).includes(value);
}

export function objectKey(photoId: string, variant: Variant): string {
  return `photos/${photoId}/${variant}`;
}

/** Removes every variant of every given photo. Missing objects are not an error. */
export async function deletePhotoObjects(env: Env, photoIds: string[]): Promise<void> {
  if (photoIds.length === 0) return;
  const keys = photoIds.flatMap((id) => VARIANTS.map((variant) => objectKey(id, variant)));
  // R2 takes up to 1000 keys per call; a cap has six.
  for (let i = 0; i < keys.length; i += 1000) {
    await env.PHOTOS.delete(keys.slice(i, i + 1000));
  }
}
