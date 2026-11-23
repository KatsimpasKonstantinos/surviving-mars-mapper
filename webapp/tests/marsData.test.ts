import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, test } from 'vite-plus/test';
import { parseMarsData } from '../src/data/marsData';
import { computeBreakthroughTiers } from '../src/helper/BreakthroughTiers';
import type { MapData } from '../src/types';

let data: MapData;
beforeAll(async () => {
  const bytes = readFileSync(new URL('../public/mars_data.bin', import.meta.url));
  data = await parseMarsData(new Uint8Array(bytes));
});

describe('mars_data.bin', () => {
  test('contains every landing site', () => {
    // Latitude 70S…70N × longitude 180W…180E in 1° steps
    expect(Object.keys(data)).toHaveLength(141 * 361);
  });

  test('decodes a known site', () => {
    const site = data['12N45E'];
    expect(site.FirstBreakthroughs).toEqual([
      'GiantCrops',
      'AncientTerraformingDevice',
      'DesignedForestation',
    ]);
    expect(['Very Flat', 'Rough', 'Steep', 'Mountainous']).toContain(site.Topography);
  });

  test('bars are 1–4 and raw values 0–255', () => {
    for (const site of Object.values(data)) {
      for (const key of ['MetalsBars', 'ConcreteBars', 'WaterBars', 'MeteorBars'] as const) {
        expect(site[key]).toBeGreaterThanOrEqual(1);
        expect(site[key]).toBeLessThanOrEqual(4);
      }
      for (const key of ['Metals', 'Concrete', 'Water', 'Meteor', 'ColdWave'] as const) {
        expect(site[key]).toBeGreaterThanOrEqual(0);
        expect(site[key]).toBeLessThanOrEqual(255);
      }
    }
  });

  test('stored first breakthroughs match the shuffle computed from the seed', () => {
    const coords = Object.keys(data);
    for (let i = 0; i < coords.length; i += 97) {
      const site = data[coords[i]];
      const [first] = computeBreakthroughTiers(BigInt(site.xxhashShuffleBreakThroughTech));
      expect(first, coords[i]).toEqual(site.FirstBreakthroughs);
    }
  });
});
