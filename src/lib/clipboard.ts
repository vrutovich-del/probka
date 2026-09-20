/**
 * Copying a code to the clipboard. The modern call needs a secure context and a user gesture, and
 * refuses in some in-app browsers, so a failure is an answer the caller shows — never a crash.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (error) {
    console.error('Could not copy to the clipboard', error);
  }
  return false;
}

/** Whether the phone can hand a code to another app (the friend code's Share button). */
export function canShare(): boolean {
  return typeof navigator.share === 'function';
}

/** Opens the phone's share sheet. False when it is missing or the child dismissed it. */
export async function shareText(text: string): Promise<boolean> {
  if (!canShare()) return false;
  try {
    await navigator.share({ text });
    return true;
  } catch {
    // AbortError is the child closing the sheet; nothing to report.
    return false;
  }
}
