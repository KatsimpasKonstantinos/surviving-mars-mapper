import type { coordinateString } from '../types';
import { normalizeCoordinateInput } from '../helper';
import { createStore, readStorage, writeStorage } from './store';

/** Sites pinned for side-by-side comparison, shared by all pages and kept across visits. */

export const MAX_COMPARE = 4;
const STORAGE_KEY = 'compare-sites';

/** "12N45E,22N33W" → valid, unique coordinates (at most MAX_COMPARE) */
export function parseSites(value: string | null): coordinateString[] {
  if (!value) return [];
  const sites = value
    .split(',')
    .map((s) => normalizeCoordinateInput(s))
    .filter((s): s is coordinateString => s !== null);
  return [...new Set(sites)].slice(0, MAX_COMPARE);
}

const store = createStore(parseSites(readStorage(STORAGE_KEY)));

export function setCompareSites(sites: coordinateString[]) {
  const next = [...new Set(sites)].slice(0, MAX_COMPARE);
  store.set(next);
  writeStorage(STORAGE_KEY, next.join(','));
}

/** Adds the site, or removes it if it is already pinned. Does nothing when the list is full. */
export function toggleCompareSite(site: coordinateString) {
  const current = store.get();
  if (current.includes(site)) setCompareSites(current.filter((s) => s !== site));
  else if (current.length < MAX_COMPARE) setCompareSites([...current, site]);
}

export const useCompareSites = store.useValue;
