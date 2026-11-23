import type { MapDataEntry } from '../types';

/**
 * The site attributes shown with 1–4 bars, in one place: the map card, Compare,
 * the Finder columns, the match preferences and the heatmap layers all use this list.
 */

type BarsKey =
  | 'DustDevilsBars'
  | 'DustStormBars'
  | 'MeteorBars'
  | 'ColdWaveBars'
  | 'MetalsBars'
  | 'ConcreteBars'
  | 'WaterBars';
type RawKey = 'DustDevils' | 'DustStorm' | 'Meteor' | 'ColdWave' | 'Metals' | 'Concrete' | 'Water';

export interface BarAttribute {
  label: string;
  kind: 'threat' | 'resource';
  /** 1–4 bars, as the game shows them */
  bars: BarsKey;
  /** The exact 0–255 value behind the bars (also the heatmap layer key) */
  raw: RawKey;
  /** Key of the match preference */
  criterion: string;
}

export const THREATS: readonly BarAttribute[] = [
  {
    label: 'Dust Devils',
    kind: 'threat',
    bars: 'DustDevilsBars',
    raw: 'DustDevils',
    criterion: 'devils',
  },
  {
    label: 'Dust Storms',
    kind: 'threat',
    bars: 'DustStormBars',
    raw: 'DustStorm',
    criterion: 'storms',
  },
  { label: 'Meteors', kind: 'threat', bars: 'MeteorBars', raw: 'Meteor', criterion: 'meteors' },
  { label: 'Cold Waves', kind: 'threat', bars: 'ColdWaveBars', raw: 'ColdWave', criterion: 'cold' },
];

export const RESOURCES: readonly BarAttribute[] = [
  { label: 'Metals', kind: 'resource', bars: 'MetalsBars', raw: 'Metals', criterion: 'metals' },
  {
    label: 'Concrete',
    kind: 'resource',
    bars: 'ConcreteBars',
    raw: 'Concrete',
    criterion: 'concrete',
  },
  { label: 'Water', kind: 'resource', bars: 'WaterBars', raw: 'Water', criterion: 'water' },
];

/** Most bars an attribute can have */
export const MAX_BARS = 4;

export const sumBars = (entry: MapDataEntry, attributes: readonly BarAttribute[]) =>
  attributes.reduce((sum, a) => sum + entry[a.bars], 0);

/** Terrain classes from flattest to roughest, in the game's order */
export const TERRAIN_ORDER = ['Very Flat', 'Steep', 'Rough', 'Mountainous'] as const;
