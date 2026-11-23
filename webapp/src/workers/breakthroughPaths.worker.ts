/// <reference lib="webworker" />
// Finds every site with a pick path that gets all target breakthroughs within N choices.
//
// A site's shuffles depend only on its seed and the list length, so the permutations
// are computed once per site and length (the slow part, a few seconds) and kept. Each
// query then only walks the pick paths. Work runs in chunks, so a newer query replaces
// one that is still running instead of queueing behind it.
import {
  BREAKTHROUGH_COUNT,
  findPickPath,
  seedFromBigInt,
  shufflePermutations,
  type Shuffler,
  type U64,
} from '../helper/fastBreakthroughs';

export type PathRequest =
  | { type: 'init'; seeds: BigInt64Array }
  | { type: 'query'; key: string; targets: number[]; maxChoices: number };

export type PathResponse =
  | { type: 'progress'; progress: number }
  | { type: 'result'; key: string; sites: Uint32Array };

declare const self: DedicatedWorkerGlobalScope;

const CHUNK = 2500;

let seeds: U64[] = [];
/** perms[k]: for every site, the permutation for lists of length BREAKTHROUGH_COUNT - k */
const perms: Uint8Array[] = [];
let latest: Extract<PathRequest, { type: 'query' }> | null = null;
let running = false;

const post = (message: PathResponse, transfer: Transferable[] = []) =>
  self.postMessage(message, transfer);
/** Lets queued messages (a newer query) arrive between chunks */
const yieldToMessages = () => new Promise((resolve) => setTimeout(resolve));

async function ensurePerms(levels: number, report: (done: number) => void) {
  const start = perms.length;
  if (levels <= start) return;
  const lengths = Array.from({ length: levels - start }, (_, k) => BREAKTHROUGH_COUNT - start - k);
  const tables = lengths.map((length) => new Uint8Array(seeds.length * length));
  for (let site = 0; site < seeds.length; site++) {
    shufflePermutations(seeds[site], lengths).forEach((perm, k) =>
      tables[k].set(perm, site * lengths[k]),
    );
    if (site % CHUNK === CHUNK - 1) {
      report(site / seeds.length);
      await yieldToMessages();
    }
  }
  perms.push(...tables);
}

function shufflerFor(site: number): Shuffler {
  return (arr) => {
    const length = arr.length;
    const table = perms[BREAKTHROUGH_COUNT - length];
    const base = site * length;
    const out = Array.from<number>({ length });
    for (let i = 0; i < length; i++) out[i] = arr[table[base + i]];
    return out;
  };
}

/** Answers the latest query; restarts when a newer one arrives mid-way */
async function run() {
  running = true;
  while (latest) {
    const query = latest;
    const { key, targets, maxChoices } = query;
    // Building the tables (first time only) counts as the first half of the progress
    const needsPerms = Math.max(1, maxChoices - 1) > perms.length;
    const scale = needsPerms ? 0.5 : 1;
    // Choice 1 shuffles the full list; each later choice shuffles a list one shorter.
    await ensurePerms(Math.max(1, maxChoices - 1), (done) =>
      post({ type: 'progress', progress: done * 0.5 }),
    );
    if (latest !== query) continue;

    const matches: number[] = [];
    let superseded = false;
    for (let site = 0; site < seeds.length; site++) {
      if (findPickPath(shufflerFor(site), maxChoices, targets)) matches.push(site);
      if (site % CHUNK === CHUNK - 1) {
        post({ type: 'progress', progress: 1 - scale + (scale * site) / seeds.length });
        await yieldToMessages();
        if (latest !== query) {
          superseded = true;
          break;
        }
      }
    }
    if (superseded) continue;
    const sites = Uint32Array.from(matches);
    post({ type: 'result', key, sites }, [sites.buffer]);
    if (latest === query) latest = null;
  }
  running = false;
}

self.onmessage = (event: MessageEvent<PathRequest>) => {
  const message = event.data;
  if (message.type === 'init') {
    seeds = Array.from(message.seeds, seedFromBigInt);
    return;
  }
  latest = message;
  if (!running) void run();
};
