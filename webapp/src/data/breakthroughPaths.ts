import { TechBreakthroughList } from '../helper/TechBreakthroughList';
import { pickPath as findPath } from '../helper/fastBreakthroughs';
import type { PathRequest, PathResponse } from '../workers/breakthroughPaths.worker';
import { createStore } from './store';

/**
 * "Which sites can get breakthroughs A, B and C within N choices, and how?"
 * The search over all sites runs in a Web Worker; recent results are cached.
 */

export const MAX_TARGETS = 3;
export const MAX_CHOICES = 5;
/** Results kept for switching back and forth between filters */
const CACHE_SIZE = 8;

const LIST: readonly string[] = TechBreakthroughList;

let coords: string[] | null = null;
let worker: Worker | null = null;
const results = new Map<string, ReadonlySet<string>>();
/** Only the latest query is answered; earlier ones are dropped by the worker */
let pendingKey: string | null = null;

const status = createStore({ running: false, progress: 0, version: 0 });
const updateStatus = (next: Partial<ReturnType<typeof status.get>>) =>
  status.set({ ...status.get(), ...next });

/** Hands over all sites ([coordinate, breakthrough seed]). Only the first call counts. */
export function setPathSearchSites(sites: [string, string][]) {
  if (coords) return;
  coords = sites.map(([coord]) => coord);
  worker = new Worker(new URL('../workers/breakthroughPaths.worker.ts', import.meta.url), {
    type: 'module',
  });
  const seeds = BigInt64Array.from(sites, ([, seed]) => BigInt(seed));
  worker.postMessage({ type: 'init', seeds } satisfies PathRequest, [seeds.buffer]);
  worker.onmessage = ({ data }: MessageEvent<PathResponse>) => {
    if (data.type === 'progress') {
      updateStatus({ progress: data.progress });
      return;
    }
    results.set(data.key, new Set(Array.from(data.sites, (i) => coords![i])));
    if (results.size > CACHE_SIZE) results.delete(results.keys().next().value!);
    if (pendingKey === data.key) pendingKey = null;
    updateStatus({ running: pendingKey !== null, progress: 0, version: status.get().version + 1 });
  };
}

// The grid asks once per row with the same model: build the key once per model.
let lastQuery: { techs: readonly string[]; maxChoices: number; key: string } | null = null;
function queryKey(techs: readonly string[], maxChoices: number) {
  if (lastQuery?.techs !== techs || lastQuery.maxChoices !== maxChoices) {
    lastQuery = { techs, maxChoices, key: `${maxChoices}:${[...techs].sort().join(',')}` };
  }
  return lastQuery.key;
}

/**
 * Sites with a pick path that gets all `techs` within `maxChoices` choices.
 * Undefined while the worker is still searching (the search starts on the first call).
 */
export function sitesWithPath(
  techs: readonly string[],
  maxChoices: number,
): ReadonlySet<string> | undefined {
  const key = queryKey(techs, maxChoices);
  const cached = results.get(key);
  if (cached || !worker || pendingKey === key) return cached;
  pendingKey = key;
  worker.postMessage({
    type: 'query',
    key,
    targets: techs.map((t) => LIST.indexOf(t)),
    maxChoices,
  } satisfies PathRequest);
  updateStatus({ running: true, progress: 0 });
  return undefined;
}

// Paths shown in the Finder rows, cached for the current goal (rows re-render on scroll)
let pathCache: { key: string; paths: Map<string, string[] | null> } | null = null;

/** The pick path for one site (breakthrough ids in order), or null if there is none */
export function pickPath(
  coord: string,
  seed: string,
  techs: readonly string[],
  maxChoices: number,
): string[] | null {
  const key = queryKey(techs, maxChoices);
  if (pathCache?.key !== key) pathCache = { key, paths: new Map() };
  let path = pathCache.paths.get(coord);
  if (path === undefined) {
    path = findPath(BigInt(seed), techs, maxChoices);
    pathCache.paths.set(coord, path);
  }
  return path;
}

export const usePathSearchStatus = status.useValue;
