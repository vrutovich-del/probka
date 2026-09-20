import sideUrl from '../assets/sample/zhiguli-side.webp';
import topUrl from '../assets/sample/zhiguli-top.webp';
import { analyse } from '../cutout/analyse';
import type { CutoutResult } from '../cutout/types';
import { findSameType, saveCap, type CapPhotoInput, type CapType } from '../db/caps';
import type { PhotoRole } from '../db/db';
import { todayIso } from './format';
import { makeThumb } from './thumb';

/**
 * The cap the design ships with the prototype, as a garage entry the child can load from Settings —
 * something to look at before going outside. The brand and product are what is printed on the cap
 * itself (МОСПИВКОМ · Жигули · ПИВО), not UI copy, so they read the same in every language.
 */
export const SAMPLE_TYPE: CapType = {
  brand: 'Жигули',
  product: 'Пиво',
  // The prototype's own record says "Aluminium screw cap", but its photo is a fluted crown cap.
  shape: 'crown',
  country: 'RU',
};

/** The sample label for the Settings row: "Жигули · Пиво". */
export const SAMPLE_LABEL = `${SAMPLE_TYPE.brand} · ${SAMPLE_TYPE.product}`;

/**
 * Both files are already transparent, so there is nothing to cut: the stored cutout is the file
 * itself, byte for byte, and only the measurements are taken from a decoded copy.
 */
async function loadPhoto(url: string, role: PhotoRole): Promise<CapPhotoInput> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not read the sample photo (${role}): ${response.status}`);
  const blob = await response.blob();
  const bitmap = await createImageBitmap(blob);
  try {
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas is not available');
    ctx.drawImage(bitmap, 0, 0);
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const mask = new Uint8Array(canvas.width * canvas.height);
    for (let i = 0; i < mask.length; i++) mask[i] = image.data[i * 4 + 3] ?? 0;
    const cutout: CutoutResult = {
      cutout: blob,
      thumb: await makeThumb(blob),
      stats: analyse(image, mask),
      timing: null,
    };
    return { role, original: blob, cutout };
  } finally {
    bitmap.close();
  }
}

export type SampleOutcome = { status: 'added'; id: string } | { status: 'already' };

/** Adds the sample once; a second press says it is already there rather than making a duplicate. */
export async function addSampleCap(): Promise<SampleOutcome> {
  if (await findSameType(SAMPLE_TYPE)) return { status: 'already' };
  const top = await loadPhoto(topUrl, 'top');
  const side = await loadPhoto(sideUrl, 'side');
  const id = await saveCap({
    type: SAMPLE_TYPE,
    condition: 'worn', // as the prototype's own record has it
    foundOn: todayIso(),
    place: '',
    useCutout: true,
    photos: [top, side],
    thumb: top.cutout?.thumb ?? null,
  });
  return { status: 'added', id };
}
