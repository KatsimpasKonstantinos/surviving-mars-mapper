import { useEffect, useState } from 'react';
import type { MapData } from '../types';
import { loadMarsData, useMarsDataProgress } from '../data/marsData';

interface MarsDataState {
  data: MapData | null;
  /** Download progress, 0–100 */
  progress: number;
  error: string | null;
}

export function useMarsData(): MarsDataState {
  const [data, setData] = useState<MapData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const progress = useMarsDataProgress();

  useEffect(() => {
    let active = true;
    loadMarsData()
      .then((d) => {
        if (active) setData(d);
      })
      .catch((e: unknown) => {
        console.error('Error loading map data:', e);
        if (active) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      active = false;
    };
  }, []);

  return { data, progress, error };
}
