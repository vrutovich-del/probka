import { useEffect, useRef, useState, type RefObject } from 'react';

/**
 * The camera behind the viewfinder of screen 12.
 *
 * Phase 1 shot through `<input capture>` — the phone's own camera app — because the app had no HTTPS
 * to test `getUserMedia` on, and a preview that cannot be tested is not a preview. The published site
 * has HTTPS now, so the stream opens with the screen and the shutter takes a frame from it.
 *
 * Everything can still refuse: an older browser has no `mediaDevices`, a parent can deny the camera,
 * a phone can hand the camera to another app. Any of those falls back to the file input, which is the
 * Phase 1 path and still works — so the child is never stuck in front of a dead viewfinder.
 */

export type CameraState = 'starting' | 'live' | 'unavailable';

export interface Camera {
  state: CameraState;
  /** Attach to the <video>; its `current` is null until React has put the element there. */
  video: RefObject<HTMLVideoElement>;
  /** A JPEG of the current frame, or null when the stream is not ready. */
  grab: () => Promise<File | null>;
}

const CONSTRAINTS: MediaStreamConstraints = {
  // The back camera where there is a choice, and as many pixels as the phone will give: the cutout
  // works at 1024, but the untouched original is what the garage keeps.
  video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1920 } },
  audio: false,
};

export function useCamera(active: boolean): Camera {
  const [state, setState] = useState<CameraState>('starting');
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!active) return;
    let live = true;

    const stop = () => {
      stream.current?.getTracks().forEach((track) => track.stop());
      stream.current = null;
      if (video.current) video.current.srcObject = null;
    };

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setState('unavailable');
        return;
      }
      try {
        const media = await navigator.mediaDevices.getUserMedia(CONSTRAINTS);
        if (!live) {
          media.getTracks().forEach((track) => track.stop());
          return;
        }
        stream.current = media;
        if (video.current) {
          video.current.srcObject = media;
          // iOS needs the play() call; a rejection here means the element went away.
          await video.current.play().catch(() => undefined);
        }
        setState('live');
      } catch (error) {
        // Denied, busy, or no camera at all — all of them mean "use the phone's own camera app".
        console.warn('Live camera unavailable, falling back to the capture input', error);
        if (live) setState('unavailable');
      }
    };

    void start();
    return () => {
      live = false;
      stop();
    };
  }, [active]);

  const grab = async (): Promise<File | null> => {
    const element = video.current;
    if (!element || !element.videoWidth || !element.videoHeight) return null;
    const canvas = document.createElement('canvas');
    canvas.width = element.videoWidth;
    canvas.height = element.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(element, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
    if (!blob) return null;
    return new File([blob], `cap-${Date.now()}.jpg`, { type: 'image/jpeg' });
  };

  return { state, video, grab };
}
