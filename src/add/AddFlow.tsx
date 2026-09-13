import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import { Navigate, Outlet } from 'react-router';
import { preloadCutout, runCutout } from '../cutout/client';
import type { CutoutProgress, CutoutResult } from '../cutout/types';
import type { CapType } from '../db/caps';
import styles from './AddFlow.module.css';

/**
 * State of one add-a-cap run (screens 12–18). It lives on the `/add` layout route, so it exists exactly
 * while the flow is open: leaving to a tab drops it, moving between steps keeps it.
 */
export interface FlowState {
  top: Blob | null;
  side: Blob | null;
  topCut: CutoutResult | null;
  sideCut: CutoutResult | null;
  /** Processing finished (with or without a cutout). */
  processed: boolean;
  /** Review decision; false after "Keep original" or a failed cutout. */
  useCutout: boolean;
  /** Identification done: a type, or null for "Not identified yet". */
  identified: boolean;
  type: CapType | null;
  savedCapId: string | null;
  /** Set when the find was added as a duplicate (×N) of a cap already in the garage (screen 11). */
  duplicateOf: string | null;
}

type Action =
  | { type: 'top'; file: Blob }
  | { type: 'side'; file: Blob | null }
  | { type: 'processed'; top: CutoutResult | null; side: CutoutResult | null }
  | { type: 'review'; useCutout: boolean }
  | { type: 'identify'; capType: CapType | null }
  | { type: 'saved'; id: string }
  | { type: 'duplicate'; id: string; capType: CapType }
  | { type: 'reset' };

const initial: FlowState = {
  top: null,
  side: null,
  topCut: null,
  sideCut: null,
  processed: false,
  useCutout: true,
  identified: false,
  type: null,
  savedCapId: null,
  duplicateOf: null,
};

function reduce(state: FlowState, action: Action): FlowState {
  switch (action.type) {
    case 'top':
      return { ...initial, top: action.file };
    case 'side':
      return { ...state, side: action.file };
    case 'processed':
      return { ...state, topCut: action.top, sideCut: action.side, processed: true, useCutout: action.top !== null };
    case 'review':
      return { ...state, useCutout: action.useCutout && state.topCut !== null };
    case 'identify':
      return { ...state, identified: true, type: action.capType };
    case 'saved':
      return { ...state, savedCapId: action.id };
    case 'duplicate':
      return { ...state, identified: true, type: action.capType, savedCapId: action.id, duplicateOf: action.id };
    case 'reset':
      return initial;
  }
}

interface Jobs {
  top?: Promise<CutoutResult>;
  side?: Promise<CutoutResult>;
}

interface FlowContext {
  state: FlowState;
  /** Latest progress from the worker: model download or compute. */
  progress: CutoutProgress | null;
  setTop: (file: Blob) => void;
  setSide: (file: Blob | null) => void;
  /** Waits for the cutouts (started as soon as each photo was taken) and records them. */
  process: () => Promise<{ top: CutoutResult | null; side: CutoutResult | null }>;
  review: (useCutout: boolean) => void;
  identify: (type: CapType | null) => void;
  saved: (id: string) => void;
  /** The find was counted as one more of an existing cap; nothing new is stored. */
  duplicate: (id: string, type: CapType) => void;
  reset: () => void;
}

const Context = createContext<FlowContext | null>(null);

export function useAddFlow(): FlowContext {
  const ctx = useContext(Context);
  if (!ctx) throw new Error('useAddFlow outside of AddFlow');
  return ctx;
}

export function AddFlowProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reduce, initial);
  const [progress, setProgress] = useState<CutoutProgress | null>(null);
  const jobs = useRef<Jobs>({});

  // Start the one-time model download while the photo is being taken.
  useEffect(() => preloadCutout(setProgress), []);

  const setTop = useCallback((file: Blob) => {
    jobs.current = { top: runCutout(file, setProgress) };
    jobs.current.top?.catch(() => undefined);
    dispatch({ type: 'top', file });
  }, []);

  const setSide = useCallback((file: Blob | null) => {
    if (file) {
      jobs.current.side = runCutout(file, setProgress);
      jobs.current.side.catch(() => undefined);
    } else {
      delete jobs.current.side;
    }
    dispatch({ type: 'side', file });
  }, []);

  const process = useCallback(async () => {
    const settle = async (job?: Promise<CutoutResult>) => {
      if (!job) return null;
      try {
        const result = await job;
        // A mask that keeps almost nothing or almost everything is not a cutout.
        if (result.stats.opaqueFraction < 0.005 || result.stats.opaqueFraction > 0.995) {
          console.warn('Cutout rejected: mask covers', result.stats.opaqueFraction);
          return null;
        }
        return result;
      } catch (error) {
        console.error('Cutout failed', error);
        return null;
      }
    };
    const top = await settle(jobs.current.top);
    const side = await settle(jobs.current.side);
    dispatch({ type: 'processed', top, side });
    return { top, side };
  }, []);

  const review = useCallback((useCutout: boolean) => dispatch({ type: 'review', useCutout }), []);
  const identify = useCallback((capType: CapType | null) => dispatch({ type: 'identify', capType }), []);
  const saved = useCallback((id: string) => dispatch({ type: 'saved', id }), []);
  const duplicate = useCallback((id: string, capType: CapType) => dispatch({ type: 'duplicate', id, capType }), []);
  const reset = useCallback(() => {
    jobs.current = {};
    dispatch({ type: 'reset' });
  }, []);

  const value = useMemo<FlowContext>(
    () => ({ state, progress, setTop, setSide, process, review, identify, saved, duplicate, reset }),
    [state, progress, setTop, setSide, process, review, identify, saved, duplicate, reset],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

/** Layout route for `/add/*`: full screen, no tab bar. */
export function AddFlow() {
  return (
    <AddFlowProvider>
      <div className={styles.flow}>
        <Outlet />
      </div>
    </AddFlowProvider>
  );
}

/** Sends a step that was opened without its prerequisites back to the first one. */
export function RequireStep({ when, children }: { when: boolean; children: ReactNode }) {
  return when ? <>{children}</> : <Navigate to="/add/top" replace />;
}
