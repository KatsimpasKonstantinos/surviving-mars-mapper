/**
 * A fast re-implementation of the breakthrough shuffle (SurvivingMarsRNG +
 * BreakthroughTiers) using 32-bit integer maths instead of BigInt, for searching
 * many sites and pick paths at once. It must produce exactly the same results as
 * the BigInt version; the unit tests compare both.
 */
import { TechBreakthroughList } from './TechBreakthroughList.ts';
import { CHOICES_PER_TIER, INVALID_TECH_INDICES } from './BreakthroughTiers.ts';

const TWO_32 = 4294967296;
const LIST: readonly string[] = TechBreakthroughList;
export const BREAKTHROUGH_COUNT = LIST.length;

/** Unsigned 64-bit value as two 32-bit halves */
export interface U64 {
  hi: number;
  lo: number;
}

/* ---- 64-bit maths on (hi, lo) pairs; results land in rHi/rLo, so nothing is allocated ---- */

let rHi = 0;
let rLo = 0;

/** High 32 bits of the 64-bit product of two unsigned 32-bit numbers (exact) */
function mulHi32(a: number, b: number): number {
  const a0 = a & 0xffff;
  const a1 = a >>> 16;
  const b0 = b & 0xffff;
  const b1 = b >>> 16;
  const w0 = a0 * b0;
  const t = a1 * b0 + Math.floor(w0 / 65536);
  const w1 = (t % 65536) + a0 * b1;
  return (a1 * b1 + Math.floor(t / 65536) + Math.floor(w1 / 65536)) >>> 0;
}

/** Low 64 bits of a × b */
function mul64(aHi: number, aLo: number, bHi: number, bLo: number) {
  rHi = (mulHi32(aLo, bLo) + Math.imul(aHi, bLo) + Math.imul(aLo, bHi)) >>> 0;
  rLo = Math.imul(aLo, bLo) >>> 0;
}

/** x ^ (x >>> n), 0 < n < 32 */
function xorShiftRight(hi: number, lo: number, n: number) {
  rLo = (lo ^ ((lo >>> n) | (hi << (32 - n)))) >>> 0;
  rHi = (hi ^ (hi >>> n)) >>> 0;
}

/** Same as BraidRandom() (splitmix64): the next state */
function braid(hi: number, lo: number) {
  // + 0x9e3779b97f4a7c15
  const sumLo = lo + 0x7f4a7c15;
  const mixedHi = (hi + 0x9e3779b9 + (sumLo >= TWO_32 ? 1 : 0)) >>> 0;
  const mixedLo = sumLo >>> 0;
  xorShiftRight(mixedHi, mixedLo, 30);
  mul64(rHi, rLo, 0xbf58476d, 0x1ce4e5b9);
  xorShiftRight(rHi, rLo, 27);
  mul64(rHi, rLo, 0x94d049bb, 0x133111eb);
  xorShiftRight(rHi, rLo, 31);
}

export function seedFromBigInt(seed: bigint): U64 {
  const u = BigInt.asUintN(64, seed);
  return { hi: Number(u >> 32n), lo: Number(u & 0xffffffffn) };
}

/**
 * The site's rand(100) draws (CreateRandFromTrueSeed), generated on demand and kept:
 * every shuffle restarts from the same seed, so all shuffles of a site read the
 * same stream, only to a different length.
 */
function drawStream(seed: U64): (k: number) => number {
  let hi = seed.hi;
  let lo = seed.lo;
  const draws: number[] = [];
  return (k) => {
    while (draws.length <= k) {
      braid(hi, lo);
      hi = rHi;
      lo = rLo;
      draws.push(((hi % 100) * (TWO_32 % 100) + (lo % 100)) % 100);
    }
    return draws[k];
  };
}

/** Same as StableShuffle(arr, rand, 100), in place */
function stableShuffle<T>(arr: T[], draw: (k: number) => number): void {
  const picked: T[] = [];
  for (let k = 0; arr.length > 1; k++) {
    const idx = draw(k);
    if (idx < arr.length) {
      picked.push(arr[idx]);
      arr.splice(idx, 1);
    }
  }
  for (let i = picked.length - 1; i >= 0; i--) arr.push(picked[i]);
}

/** The first CHOICES_PER_TIER non-excluded entries */
function offered<T>(order: T[], excluded: ReadonlySet<T>): T[] {
  const out: T[] = [];
  for (const t of order) {
    if (excluded.has(t)) continue;
    out.push(t);
    if (out.length === CHOICES_PER_TIER) break;
  }
  return out;
}

/** Same result as computeBreakthroughTiers(seed, path) */
export function fastTiers<T>(
  seed: U64,
  list: readonly T[],
  excluded: ReadonlySet<T>,
  path: readonly T[] = [],
): T[][] {
  const draw = drawStream(seed);
  const order = [...list];
  stableShuffle(order, draw);
  const tiers = [offered(order, excluded)];
  for (const pick of path) {
    stableShuffle(order, draw);
    const i = order.lastIndexOf(pick);
    if (i !== -1) order.splice(i, 1);
    tiers.push(offered(order, excluded));
  }
  return tiers;
}

/**
 * How a site shuffles a list depends only on the list's length, not its contents.
 * Record that as one permutation per length: shuffled[i] = original[perm[i]].
 */
export function shufflePermutations(seed: U64, lengths: readonly number[]): number[][] {
  const draw = drawStream(seed);
  return lengths.map((length) => {
    const perm = Array.from({ length }, (_, i) => i);
    stableShuffle(perm, draw);
    return perm;
  });
}

/** Shuffles a list of breakthrough indices the way the game does for one site */
export type Shuffler = (arr: readonly number[]) => number[];

/** Shuffler for one seed, caching one permutation per list length */
export function createShuffler(seed: U64): Shuffler {
  const draw = drawStream(seed);
  const perms = new Map<number, number[]>();
  return (arr) => {
    let perm = perms.get(arr.length);
    if (!perm) {
      perm = Array.from({ length: arr.length }, (_, i) => i);
      stableShuffle(perm, draw);
      perms.set(arr.length, perm);
    }
    return perm.map((i) => arr[i]);
  };
}

/**
 * Finds a pick path that gets every target breakthrough within `maxChoices` choices:
 * at each choice one of the three offered breakthroughs is picked. Targets are picked
 * as soon as they are offered; other picks fill the gaps only while there is room.
 * Returns the picks (indices into TechBreakthroughList) in order, or null.
 */
export function findPickPath(
  shuffled: Shuffler,
  maxChoices: number,
  targets: readonly number[],
): number[] | null {
  if (targets.length === 0) return [];
  if (targets.length > maxChoices) return null;
  const path: number[] = [];

  const search = (order: number[], choice: number, missing: number[]): boolean => {
    const choicesLeft = maxChoices - choice + 1;
    if (missing.length > choicesLeft) return false;
    const tier = offered(order, INVALID_TECH_INDICES);
    const hits = tier.filter((t) => missing.includes(t));
    const picks =
      missing.length < choicesLeft ? [...hits, ...tier.filter((t) => !hits.includes(t))] : hits;
    if (picks.length === 0) return false;

    const next = choice < maxChoices ? shuffled(order) : null;
    for (const pick of picks) {
      path.push(pick);
      const rest = missing.filter((t) => t !== pick);
      if (rest.length === 0) return true;
      if (
        next &&
        search(
          next.filter((t) => t !== pick),
          choice + 1,
          rest,
        )
      )
        return true;
      path.pop();
    }
    return false;
  };

  const start = shuffled(Array.from({ length: BREAKTHROUGH_COUNT }, (_, i) => i));
  return search(start, 1, [...targets]) ? path : null;
}

/** The pick path for one site, as breakthrough ids in order, or null if there is none */
export function pickPath(
  seed: bigint,
  techs: readonly string[],
  maxChoices: number,
): string[] | null {
  const path = findPickPath(
    createShuffler(seedFromBigInt(seed)),
    maxChoices,
    techs.map((t) => LIST.indexOf(t)),
  );
  return path && path.map((i) => LIST[i]);
}
