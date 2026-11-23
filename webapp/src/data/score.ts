import type { MapData, MapDataEntry } from '../types';
import { clamp } from '../helper';
import { RESOURCES, TERRAIN_ORDER, THREATS } from './attributes';
import { createStore, readStorage, writeStorage } from './store';

/**
 * Site match: for every criterion the player says whether they want less or more of it
 * (-2 … +2, 0 = ignore). Values are normalised to 0–1 over all sites (raw 0–255 values,
 * not the coarse bars), flipped where less is wanted, and averaged by strength → 0–100.
 * So "rich but hard" is as easy to ask for as "safe and easy".
 */

export const MAX_WEIGHT = 2;

export interface ScoreCriterion {
  key: string;
  label: string;
  group: 'Resources' | 'Disasters' | 'Site';
  /** What the two ends of the scale mean */
  less: string;
  more: string;
  value: (entry: MapDataEntry) => number;
}

export const SCORE_CRITERIA: ScoreCriterion[] = [
  ...RESOURCES.map((a) => ({
    key: a.criterion,
    label: a.label,
    group: 'Resources' as const,
    less: 'less',
    more: 'more',
    value: (e: MapDataEntry) => e[a.raw],
  })),
  ...THREATS.map((a) => ({
    key: a.criterion,
    label: a.label,
    group: 'Disasters' as const,
    less: 'fewer',
    more: 'more',
    value: (e: MapDataEntry) => e[a.raw],
  })),
  {
    key: 'terrain',
    label: 'Terrain',
    group: 'Site',
    less: 'flatter',
    more: 'rougher',
    // 0 = very flat … 1 = mountainous
    value: (e) =>
      Math.max(0, TERRAIN_ORDER.indexOf(e.Topography as never)) / (TERRAIN_ORDER.length - 1),
  },
  {
    key: 'challenge',
    label: 'Challenge',
    group: 'Site',
    less: 'easier',
    more: 'harder',
    value: (e) => e.Difficulty,
  },
];

export type Weights = Record<string, number>;

const weights = (w: Weights): Weights => ({
  ...Object.fromEntries(SCORE_CRITERIA.map((c) => [c.key, 0])),
  ...w,
});

export const PRESETS: { key: string; label: string; weights: Weights }[] = [
  {
    key: 'easy',
    label: 'Easy start',
    weights: weights({
      metals: 2,
      concrete: 1,
      water: 2,
      devils: -1,
      storms: -1,
      meteors: -1,
      cold: -1,
      terrain: -1,
    }),
  },
  {
    key: 'hard-rich',
    label: 'Hard but rich',
    weights: weights({ metals: 1, concrete: 1, water: 1, challenge: 2 }),
  },
  {
    key: 'max',
    label: 'Max challenge',
    weights: weights({ devils: 1, storms: 1, meteors: 1, cold: 1, terrain: 1, challenge: 2 }),
  },
];

export const DEFAULT_WEIGHTS: Weights = PRESETS[0].weights;

/** Total strength of all criteria (0 = no score) */
export const totalWeight = (w: Weights) =>
  SCORE_CRITERIA.reduce((sum, c) => sum + Math.abs(w[c.key] ?? 0), 0);

export const sameWeights = (a: Weights, b: Weights) =>
  SCORE_CRITERIA.every((c) => (a[c.key] ?? 0) === (b[c.key] ?? 0));

/* ---- Scoring ---- */

/** Match 0–100 of a site (undefined for unknown coordinates) */
export type SiteScores = (coord: string) => number | undefined;

/** Every criterion normalised to 0–1, once per data set (the data never changes) */
interface Normalised {
  index: Map<string, number>;
  columns: Map<string, Float64Array>;
}
const normalisedCache = new WeakMap<MapData, Normalised>();

function normalised(mapData: MapData): Normalised {
  let cached = normalisedCache.get(mapData);
  if (cached) return cached;
  const entries = Object.values(mapData);
  const index = new Map(Object.keys(mapData).map((coord, i) => [coord, i]));
  const columns = new Map<string, Float64Array>();
  for (const c of SCORE_CRITERIA) {
    const values = Float64Array.from(entries, c.value);
    let lo = Infinity;
    let hi = -Infinity;
    for (const v of values) {
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    const span = hi - lo || 1;
    columns.set(
      c.key,
      values.map((v) => (v - lo) / span),
    );
  }
  cached = { index, columns };
  normalisedCache.set(mapData, cached);
  return cached;
}

// Map, Finder and Compare ask for the same scores: keep the last result.
let lastScores: { mapData: MapData; key: string; scores: SiteScores } | null = null;

/** Match for every site, or null when every criterion is ignored. */
export function scoreSites(mapData: MapData, w: Weights): SiteScores | null {
  const total = totalWeight(w);
  if (!total) return null;
  const key = encodeWeights(w);
  if (lastScores?.mapData === mapData && lastScores.key === key) return lastScores.scores;

  const { index, columns } = normalised(mapData);
  const sums = new Float64Array(index.size);
  for (const c of SCORE_CRITERIA) {
    const weight = w[c.key] ?? 0;
    if (!weight) continue;
    const column = columns.get(c.key)!;
    const strength = Math.abs(weight);
    for (let i = 0; i < sums.length; i++) {
      sums[i] += strength * (weight > 0 ? column[i] : 1 - column[i]);
    }
  }
  for (let i = 0; i < sums.length; i++) sums[i] = Math.round((sums[i] / total) * 1000) / 10;

  const scores: SiteScores = (coord) => {
    const i = index.get(coord);
    return i === undefined ? undefined : sums[i];
  };
  lastScores = { mapData, key, scores };
  return scores;
}

/* ---- Text encoding: "metals2meteors-1" ---- */

export function encodeWeights(w: Weights): string {
  return SCORE_CRITERIA.filter((c) => (w[c.key] ?? 0) !== 0)
    .map((c) => `${c.key}${w[c.key]}`)
    .join('');
}

export function decodeWeights(s: string | null): Weights | null {
  if (!s) return null;
  const w = weights({});
  for (const [, key, n] of s.matchAll(/([a-z]+)(-?\d)/g)) {
    if (key in w) w[key] = clamp(Number(n), -MAX_WEIGHT, MAX_WEIGHT);
  }
  return totalWeight(w) > 0 ? w : null;
}

/* ---- Shared store: Map, Finder and Compare see the same preferences, kept across visits ---- */

// New key: the old one held importance levels (0–3) without a direction.
const STORAGE_KEY = 'score-preferences';
/** Stored when every criterion is ignored (an empty string would mean "use the defaults") */
const NONE = 'none';

const stored = readStorage(STORAGE_KEY);
const store = createStore<Weights>(
  stored === NONE ? weights({}) : (decodeWeights(stored) ?? DEFAULT_WEIGHTS),
);

export function setWeights(next: Weights) {
  store.set(next);
  writeStorage(STORAGE_KEY, encodeWeights(next) || NONE);
}

/** Changes one criterion, based on the latest stored weights (safe for quick successive clicks) */
export function setWeight(key: string, level: number) {
  setWeights({ ...store.get(), [key]: clamp(level, -MAX_WEIGHT, MAX_WEIGHT) });
}

export const useWeights = store.useValue;
