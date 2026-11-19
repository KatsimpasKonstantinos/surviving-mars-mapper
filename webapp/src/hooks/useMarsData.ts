import { useEffect, useState } from 'react';
import type { MapData } from '../types';
import { loadMarsData, onMarsDataProgress } from '../data/marsData';

export interface MarsDataState {
  data: MapData | null;
  progress: number;
  error: string | null;
}

export function useMarsData(): MarsDataState {
  const [data, setData] = useState<MapData | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const unsubscribe = onMarsDataProgress((p) => {
      if (active) setProgress(p);
    });
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
      unsubscribe();
    };
  }, []);

  return { data, progress, error };
}
