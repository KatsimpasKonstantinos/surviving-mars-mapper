import { useEffect, useEffectEvent } from 'react';
import { useSearchParams } from 'react-router';
import type { coordinateString } from '../types';
import { normalizeCoordinateInput } from '../helper';

/* ---- Query parameters ---- */

/** Selected landing site, e.g. `?c=12N45E` */
export const COORD_PARAM = 'c';
/** Picked breakthrough path, e.g. `?bt=SoylentGreen,HiveMind` */
export const BREAKTHROUGH_PARAM = 'bt';
/** Map heatmap layer, e.g. `?layer=Metals` */
export const LAYER_PARAM = 'layer';
/** Map view, `?view=2d` (3D otherwise) */
export const VIEW_PARAM = 'view';
/** Finder: open the match preferences right away */
export const PREFS_PARAM = 'prefs';
/** Compare: a shared list of sites, e.g. `?sites=12N45E,22N33W` */
export const SITES_PARAM = 'sites';

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

/** `?c=…&bt=A,B` for a site with a breakthrough path (or a single first pick) */
export const breakthroughSearch = (coord: coordinateString, path: readonly string[]) =>
  coordinateSearch(coord, path.length ? { [BREAKTHROUGH_PARAM]: path.join(',') } : undefined);

/** One query parameter as state; setting it replaces the history entry. Empty = removed. */
export function useSearchParam(key: string): [string | null, (value: string | null) => void] {
  const [params, setParams] = useSearchParams();
  const set = (value: string | null) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );
  return [params.get(key), set];
}

/**
 * Keeps the selected coordinate and the URL in sync:
 * - state → URL: debounced `replaceState`, so dragging across the 2D map does not
 *   flood the history (Safari throttles more than 100 updates per 30 s).
 * - URL → state: whenever `?c=` changes, whether by a link, back/forward or a typed URL.
 *   So any link to `?c=…` selects that site; no extra click handler needed.
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

  // Only reacts to the URL changing; our own write above lands on the same value.
  const adoptUrlCoord = useEffectEvent((fromUrl: coordinateString | null) => {
    if (fromUrl && fromUrl !== coord) setCoord(fromUrl);
  });
  useEffect(() => {
    adoptUrlCoord(normalizeCoordinateInput(urlCoord));
  }, [urlCoord]);
}
