import { liveQuery } from 'dexie';
import { useEffect, useState, type DependencyList } from 'react';

/** Re-runs a Dexie query whenever the tables it read change. `undefined` until the first result. */
export function useLiveQuery<T>(querier: () => Promise<T> | T, deps: DependencyList): T | undefined {
  const [value, setValue] = useState<T>();
  useEffect(() => {
    const subscription = liveQuery(querier).subscribe({
      next: setValue,
      error: (error) => console.error('Live query failed', error),
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return value;
}
