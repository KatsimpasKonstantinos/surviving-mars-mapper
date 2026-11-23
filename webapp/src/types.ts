export type coordinate = {
  lat: number;
  long: number;
};

export type coordinateString = `${number}${'N' | 'S'}${number}${'E' | 'W'}`;

export interface MapDataEntry {
  SiteName: string;
  Altitude: number;
  Temperature: number;
  Topography: string;
  Difficulty: number;

  DustDevilsBars: number;
  DustStormBars: number;
  MeteorBars: number;
  ColdWaveBars: number;

  MetalsBars: number;
  ConcreteBars: number;
  WaterBars: number;

  /** Raw 0–255 values behind the bars (finer than the 1–4 bars) */
  Metals: number;
  Concrete: number;
  Water: number;
  DustDevils: number;
  DustStorm: number;
  Meteor: number;
  ColdWave: number;

  MapTemplateID: string;

  xxhashShuffleBreakThroughTech: string;
  /** The three breakthroughs offered at the first choice (precomputed from the seed). */
  FirstBreakthroughs: string[];
}

export type MapData = Record<string, MapDataEntry>;
