import { useEffect } from 'react';
import { useSearchParams } from 'react-router';
import type { coordinateString } from '../types';
import { normalizeCoordinateInput } from '../helper';

/** Query parameter that holds the selected landing site, e.g. `?c=12N45E`. */
export const COORD_PARAM = 'c';
/** Query parameter that holds the picked breakthrough path, e.g. `?bt=SoylentGreen,HiveMind`. */
export const BREAKTHROUGH_PARAM = 'bt';

export function readCoordinateFromLocation(): coordinateString | null {
  return normalizeCoordinateInput(new URLSearchParams(window.location.search).get(COORD_PARAM));
}

/** Builds a `?c=…` search string so links keep the selected site. */
export function coordinateSearch(
  coord: coordinateString | null,
  extra?: Record<string, string>,
): string {
  const params = new URLSearchParams(extra);
  if (coord) params.set(COORD_PARAM, coord);
  const s = params.toString();
  return s ? `?${s}` : '';
}

/**
 * Keeps the selected coordinate and the URL in sync:
 * - state → URL: debounced `replaceState`, so dragging across the 2D map does not
 *   flood the history (Safari throttles more than 100 updates per 30 s).
 * - URL → state: on browser back/forward.
 */
export function useCoordinateUrlSync(
  coord: coordinateString | null,
  setCoord: (c: coordinateString | null) => void,
) {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlCoord = searchParams.get(COORD_PARAM);

  useEffect(() => {
    if (urlCoord === coord || (!urlCoord && !coord)) return;
    const id = window.setTimeout(() => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          // A breakthrough path only makes sense for the site it was picked on.
          if (normalizeCoordinateInput(prev.get(COORD_PARAM)) !== coord) {
            next.delete(BREAKTHROUGH_PARAM);
          }
          if (coord) next.set(COORD_PARAM, coord);
          else next.delete(COORD_PARAM);
          return next;
        },
        { replace: true },
      );
    }, 300);
    return () => window.clearTimeout(id);
  }, [coord, urlCoord, setSearchParams]);

  useEffect(() => {
    const onPopState = () => setCoord(readCoordinateFromLocation());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [setCoord]);
}
