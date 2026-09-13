const THUMB_EDGE = 256;

/** A ≤256 px PNG of a photo, for the garage tile when a cap keeps its original instead of a cutout. */
export async function makeThumb(source: Blob): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(source, { imageOrientation: 'from-image' });
  } catch {
    bitmap = await createImageBitmap(source);
  }
  try {
    const scale = Math.min(1, THUMB_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas is not available');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))), 'image/png'),
    );
  } finally {
    bitmap.close();
  }
}
