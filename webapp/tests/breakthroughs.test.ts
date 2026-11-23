import { describe, expect, test } from 'vite-plus/test';
import { computeBreakthroughTiers, InvalidTechs } from '../src/helper/BreakthroughTiers';
import { TechBreakthroughList } from '../src/helper/TechBreakthroughList';
import {
  fastTiers,
  pickPath,
  seedFromBigInt,
  shufflePermutations,
} from '../src/helper/fastBreakthroughs';
import { seeds } from './seeds';

const LIST: readonly string[] = TechBreakthroughList;

/** Every complete pick path of `choices` picks, using the reference BigInt implementation */
function referencePaths(seed: bigint, choices: number): string[][] {
  const paths: string[][] = [];
  const walk = (path: string[]) => {
    if (path.length === choices) {
      paths.push(path);
      return;
    }
    for (const tech of computeBreakthroughTiers(seed, path).at(-1)!) walk([...path, tech]);
  };
  walk([]);
  return paths;
}

/** Is `path` a valid sequence of picks for this seed (each pick offered at its choice)? */
function isValidPath(seed: bigint, path: string[]) {
  const tiers = computeBreakthroughTiers(seed, path);
  return path.every((tech, i) => tiers[i].includes(tech));
}

const find = (seed: bigint, choices: number, targets: string[]) => pickPath(seed, targets, choices);

describe('fast breakthrough shuffle', () => {
  test('matches the BigInt implementation on pick paths of 0–4 picks', () => {
    let n = 0;
    for (const seed of seeds(300)) {
      const path: string[] = [];
      let tiers = computeBreakthroughTiers(seed, path);
      for (let d = 0; d < n % 5; d++) {
        const offer = tiers.at(-1)!;
        path.push(offer[(n + d) % offer.length]);
        tiers = computeBreakthroughTiers(seed, path);
      }
      expect(fastTiers(seedFromBigInt(seed), LIST, InvalidTechs, path)).toEqual(tiers);
      n++;
    }
  });

  test('one random stream serves every list length', () => {
    for (const seed of seeds(30)) {
      const u = seedFromBigInt(seed);
      const together = shufflePermutations(u, [67, 66, 65, 64]);
      [67, 66, 65, 64].forEach((length, k) =>
        expect(together[k]).toEqual(shufflePermutations(u, [length])[0]),
      );
    }
  });

  test('offers three breakthroughs and never an excluded one', () => {
    for (const seed of seeds(50)) {
      const [first] = fastTiers(seedFromBigInt(seed), LIST, InvalidTechs);
      expect(first).toHaveLength(3);
      for (const tech of InvalidTechs) expect(first).not.toContain(tech);
    }
  });
});

describe('pick path search', () => {
  test.each([2, 3, 4])('agrees with a brute-force search within %i choices', (choices) => {
    let found = 0;
    let cases = 0;
    for (const seed of seeds(choices === 4 ? 5 : 10)) {
      const paths = referencePaths(seed, choices);
      const allowed = LIST.filter((t) => !InvalidTechs.has(t));
      for (let k = 0; k < 30; k++) {
        // Half the targets come from one real path (always possible), half from anywhere
        const size = 1 + (k % Math.min(3, choices));
        const pool = k % 2 ? paths[(k * 11) % paths.length] : allowed;
        const targets = [
          ...new Set(
            Array.from(
              { length: size },
              (_, j) =>
                pool[(k * 7 + j * 5 + Number(BigInt.asUintN(64, seed) % 61n)) % pool.length],
            ),
          ),
        ];
        const possible = paths.some((p) => targets.every((t) => p.includes(t)));
        const path = find(seed, choices, targets);
        cases++;
        expect(path !== null, `${seed}: ${targets.join(', ')}`).toBe(possible);
        if (!path) continue;
        found++;
        expect(path.length).toBeLessThanOrEqual(choices);
        expect(isValidPath(seed, path)).toBe(true);
        for (const t of targets) expect(path).toContain(t);
        // The path stops at the last target
        expect(targets).toContain(path.at(-1));
      }
    }
    // Both outcomes were exercised
    expect(found).toBeGreaterThan(0);
    expect(found).toBeLessThan(cases);
  });

  test('a single target at the first choice is just the first offer', () => {
    for (const seed of seeds(20)) {
      const [first] = computeBreakthroughTiers(seed);
      for (const tech of first) expect(find(seed, 1, [tech])).toEqual([tech]);
      const other = LIST.find((t) => !first.includes(t) && !InvalidTechs.has(t))!;
      expect(find(seed, 1, [other])).toBeNull();
    }
  });

  test('more targets than choices is impossible, no targets is trivial', () => {
    const [seed] = seeds(1);
    const [first] = computeBreakthroughTiers(seed);
    expect(find(seed, 2, first)).toBeNull();
    expect(find(seed, 3, [])).toEqual([]);
  });
});
