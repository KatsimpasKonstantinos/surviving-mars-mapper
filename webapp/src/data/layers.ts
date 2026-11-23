import type { MapData, MapDataEntry } from '../types';
import { RESOURCES, TERRAIN_ORDER, THREATS, type BarAttribute } from './attributes';
import { COLORMAPS } from './colormaps';
import { categorical, colorize, gridFromLookup, gridValues, mask, type RGBA } from './heatmap';
import type { SiteScores } from './score';

/** Highlight colour of the "Finder results" layer (the site's yellow) */
const FINDER_HIGHLIGHT = '#ffff00';

// Colours of the Topography heatmap (viridis), matched cell by cell against the site data.
const TERRAIN_COLORS: Record<(typeof TERRAIN_ORDER)[number], string> = {
  'Very Flat': '#440154',
  Steep: '#31688e',
  Rough: '#35b779',
  Mountainous: '#fde725',
};

type LayerGroup = 'Terrain' | 'Threats' | 'Resources' | 'Custom';
export const LAYER_GROUPS: LayerGroup[] = ['Terrain', 'Threats', 'Resources', 'Custom'];

interface LayerBase {
  label: string;
  group: LayerGroup;
}

/** Continuous value coloured along a scale */
interface ScaleLayer extends LayerBase {
  kind: 'scale';
  stops: string[];
  value: (entry: MapDataEntry) => number;
  /** Show the real min/max with this unit; otherwise "Low"/"High" */
  unit?: string;
}

interface CategoryLayer extends LayerBase {
  kind: 'categories';
  categories: { label: string; color: string }[];
  category: (entry: MapDataEntry) => string;
}

/** Computed at runtime: the player's match ("score") or the Finder's results ("finder") */
interface ComputedLayer extends LayerBase {
  kind: 'score' | 'finder';
  stops: string[];
}

export type Layer = ScaleLayer | CategoryLayer | ComputedLayer;

const scale = (
  label: string,
  group: LayerGroup,
  stops: string[],
  value: ScaleLayer['value'],
  unit?: string,
): ScaleLayer => ({ kind: 'scale', label, group, stops, value, unit });

const barLayer = (a: BarAttribute): [string, ScaleLayer] => [
  a.raw,
  scale(a.label, a.kind === 'threat' ? 'Threats' : 'Resources', COLORMAPS[a.raw], (e) => e[a.raw]),
];

/** Keys are the `layer` URL parameter values (kept from the image-based heatmaps). */
export const LAYERS: Record<string, Layer> = {
  Altitude: scale('Altitude', 'Terrain', COLORMAPS.Altitude, (e) => e.Altitude, ' m'),
  Temperature: scale('Temperature', 'Terrain', COLORMAPS.Temperature, (e) => e.Temperature, '°C'),
  Topography: {
    kind: 'categories',
    label: 'Terrain',
    group: 'Terrain',
    categories: TERRAIN_ORDER.map((label) => ({ label, color: TERRAIN_COLORS[label] })),
    category: (e) => e.Topography,
  },
  Difficulty: scale('Challenge', 'Terrain', COLORMAPS.Difficulty, (e) => e.Difficulty, '%'),
  ...Object.fromEntries([...THREATS, ...RESOURCES].map(barLayer)),
  Score: { kind: 'score', label: 'Your match', group: 'Custom', stops: COLORMAPS.Score },
  Finder: {
    kind: 'finder',
    label: 'Finder results',
    group: 'Custom',
    stops: [FINDER_HIGHLIGHT, FINDER_HIGHLIGHT],
  },
};

/** Representative colours of a layer (for swatches and legends) */
export const layerStops = (layer: Layer) =>
  layer.kind === 'categories' ? layer.categories.map((c) => c.color) : layer.stops;

interface LayerInputs {
  mapData: MapData;
  scores: SiteScores | null;
  finderMatches: ReadonlySet<string> | null;
}

/** RGBA texels for the globe, or null when there is nothing to draw */
export function layerPixels(
  layer: Layer,
  { mapData, scores, finderMatches }: LayerInputs,
): RGBA | null {
  switch (layer.kind) {
    case 'scale':
      return colorize(gridValues(mapData, layer.value), layer.stops);
    case 'categories':
      return categorical(
        mapData,
        layer.category,
        Object.fromEntries(layer.categories.map((c) => [c.label, c.color])),
      );
    case 'score':
      // Fixed 0–100 range, so a colour means the same whatever the preferences
      return scores ? colorize(gridFromLookup(scores), layer.stops, 0, 100) : null;
    case 'finder':
      return finderMatches ? mask(finderMatches, FINDER_HIGHLIGHT) : null;
  }
}
