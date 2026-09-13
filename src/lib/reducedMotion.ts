import { useSyncExternalStore } from 'react';

const query = () => window.matchMedia('(prefers-reduced-motion: reduce)');

function subscribe(fn: () => void): () => void {
  const mq = query();
  mq.addEventListener('change', fn);
  return () => mq.removeEventListener('change', fn);
}

/** True when the phone asks for reduced motion: sequences become a crossfade, rotation and inertia stop. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, () => query().matches);
}
