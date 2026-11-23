import { describe, expect, test } from 'vite-plus/test';
import {
  decodeWeights,
  DEFAULT_WEIGHTS,
  encodeWeights,
  MAX_WEIGHT,
  PRESETS,
  SCORE_CRITERIA,
  scoreSites,
  type Weights,
} from '../src/data/score';
import type { MapData, MapDataEntry } from '../src/types';

const site = (overrides: Partial<MapDataEntry>): MapDataEntry => ({
  SiteName: '',
  Altitude: 0,
  Temperature: 0,
  Topography: 'Very Flat',
  Difficulty: 100,
  DustDevilsBars: 1,
  DustStormBars: 1,
  MeteorBars: 1,
  ColdWaveBars: 1,
  MetalsBars: 1,
  ConcreteBars: 1,
  WaterBars: 1,
  Metals: 0,
  Concrete: 0,
  Water: 0,
  DustDevils: 0,
  DustStorm: 0,
  Meteor: 0,
  ColdWave: 0,
  MapTemplateID: '',
  xxhashShuffleBreakThroughTech: '0',
  FirstBreakthroughs: [],
  ...overrides,
});

const only = (key: string, level = 1): Weights => ({
  ...Object.fromEntries(SCORE_CRITERIA.map((c) => [c.key, 0])),
  [key]: level,
});

/** All scores as { coord: match }, {} when everything is ignored */
const scoreRecord = (data: MapData, w: Weights) => {
  const scores = scoreSites(data, w);
  return scores ? Object.fromEntries(Object.keys(data).map((c) => [c, scores(c)])) : {};
};

describe('site match', () => {
  const data: MapData = {
    '1S1E': site({ Metals: 0, Meteor: 200, Topography: 'Mountainous', Difficulty: 300 }),
    '2S2E': site({ Metals: 100, Meteor: 100, Topography: 'Steep', Difficulty: 200 }),
    '3S3E': site({ Metals: 200, Meteor: 0, Topography: 'Very Flat', Difficulty: 100 }),
  };

  test('normalizes each criterion to 0–100 over all sites', () => {
    expect(scoreRecord(data, only('metals'))).toEqual({ '1S1E': 0, '2S2E': 50, '3S3E': 100 });
  });

  test('the direction is up to the player', () => {
    expect(scoreRecord(data, only('meteors', -1))).toEqual({ '1S1E': 0, '2S2E': 50, '3S3E': 100 });
    expect(scoreRecord(data, only('meteors', 1))).toEqual({ '1S1E': 100, '2S2E': 50, '3S3E': 0 });
    expect(scoreRecord(data, only('challenge', 2))).toEqual({ '1S1E': 100, '2S2E': 50, '3S3E': 0 });
  });

  test('terrain: very flat < steep < rough < mountainous', () => {
    const rougher = scoreRecord(
      { ...data, '4S4E': site({ Topography: 'Rough' }) },
      only('terrain', 1),
    );
    expect(rougher['3S3E']).toBe(0);
    expect(rougher['2S2E']).toBeCloseTo(33.3, 1);
    expect(rougher['4S4E']).toBeCloseTo(66.7, 1);
    expect(rougher['1S1E']).toBe(100);
  });

  test('strength weighs criteria against each other, whatever the direction', () => {
    const scores = scoreRecord(
      { a: site({ Metals: 255, Meteor: 255 }), b: site({ Metals: 0, Meteor: 0 }) },
      { ...only('metals', 2), meteors: -1 },
    );
    expect(scores).toEqual({ a: 66.7, b: 33.3 });
  });

  test('"hard but rich" prefers a hard rich site over an easy rich one', () => {
    const hardRich = PRESETS.find((p) => p.key === 'hard-rich')!.weights;
    const scores = scoreRecord(
      {
        hardRich: site({ Metals: 255, Concrete: 255, Water: 255, Difficulty: 300 }),
        easyRich: site({ Metals: 255, Concrete: 255, Water: 255, Difficulty: 100 }),
        hardPoor: site({ Difficulty: 300 }),
      },
      hardRich,
    );
    expect(scores.hardRich).toBe(100);
    expect(scores.hardRich).toBeGreaterThan(scores.easyRich!);
    expect(scores.hardRich).toBeGreaterThan(scores.hardPoor!);
  });

  test('everything ignored, no match', () => {
    expect(scoreRecord(data, only('metals', 0))).toEqual({});
  });

  test('a criterion that is the same everywhere does not divide by zero', () => {
    expect(scoreRecord(data, only('water'))).toEqual({ '1S1E': 0, '2S2E': 0, '3S3E': 0 });
  });

  test('preferences survive the text round trip, including negative levels', () => {
    expect(encodeWeights({ ...only('metals', 2), meteors: -1 })).toBe('metals2meteors-1');
    expect(decodeWeights(encodeWeights(DEFAULT_WEIGHTS))).toEqual(DEFAULT_WEIGHTS);
    for (const preset of PRESETS)
      expect(decodeWeights(encodeWeights(preset.weights))).toEqual(preset.weights);
  });

  test('decoding ignores unknown keys, caps levels and rejects all-ignored', () => {
    expect(decodeWeights('metals9bogus2')).toEqual(only('metals', MAX_WEIGHT));
    expect(decodeWeights('cold-7')).toEqual(only('cold', -MAX_WEIGHT));
    expect(decodeWeights('metals0')).toBeNull();
    expect(decodeWeights('')).toBeNull();
  });
});
