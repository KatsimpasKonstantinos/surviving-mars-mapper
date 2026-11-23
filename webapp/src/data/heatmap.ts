import type { MapData, MapDataEntry } from '../types';
import { clamp, coordinateTocoordinateString, LAT_LIMIT, LONG_LIMIT } from '../helper';

/**
 * Heatmaps are drawn from the site data itself: one texel per landing site,
 * 361 × 141 (longitude −180…180 × latitude −70…70).
 *
 * Texel rows run bottom-up (WebGL convention): row 0 is latitude 70 (70S),
 * row 140 is latitude −70 (70N). Column 0 is longitude −180.
 */
export const GRID_WIDTH = LONG_LIMIT * 2 + 1;
export const GRID_HEIGHT = LAT_LIMIT * 2 + 1;

const LAT_MAX = LAT_LIMIT;
const LONG_MIN = -LONG_LIMIT;

/** Coordinate string of every texel, in texel order. */
export const GRID_COORDS = (() => {
  const coords: string[] = Array.from({ length: GRID_WIDTH * GRID_HEIGHT });
  for (let row = 0; row < GRID_HEIGHT; row++) {
    for (let col = 0; col < GRID_WIDTH; col++) {
      coords[row * GRID_WIDTH + col] = coordinateTocoordinateString({
        lat: LAT_MAX - row,
        long: LONG_MIN + col,
      });
    }
  }
  return coords;
})();

/* ---- Map surface (texture UV) <-> site ---- */

/** The heatmap covers this band of the map texture's height (v, bottom-up) */
export const OVERLAY_V_MIN = 0.1;
export const OVERLAY_V_MAX = 0.9;

/**
 * Site under a point of the map texture: the heatmap cell (texel) that contains it.
 * Uses the same 361 × 141 grid as the heatmap, so hover, click and colours always agree.
 */
export function uvToCoordinate(u: number, v: number): { lat: number; long: number } {
  const col = clamp(Math.floor(u * GRID_WIDTH), 0, GRID_WIDTH - 1);
  const band = (v - OVERLAY_V_MIN) / (OVERLAY_V_MAX - OVERLAY_V_MIN);
  const row = clamp(Math.floor(band * GRID_HEIGHT), 0, GRID_HEIGHT - 1);
  return { lat: LAT_MAX - row, long: LONG_MIN + col };
}

/** Centre of a site's heatmap cell on the map texture (where the marker belongs) */
export function coordinateToUv(coord: { lat: number; long: number }): { u: number; v: number } {
  const col = coord.long - LONG_MIN;
  const row = LAT_MAX - coord.lat;
  return {
    u: (col + 0.5) / GRID_WIDTH,
    v: OVERLAY_V_MIN + ((row + 0.5) / GRID_HEIGHT) * (OVERLAY_V_MAX - OVERLAY_V_MIN),
  };
}

export type RGBA = Uint8Array;

/** Reads one number per site (NaN = no data) into texel order. */
export function gridValues(mapData: MapData, value: (entry: MapDataEntry) => number): Float32Array {
  const out = new Float32Array(GRID_COORDS.length);
  GRID_COORDS.forEach((coord, i) => {
    const entry = mapData[coord];
    out[i] = entry ? value(entry) : NaN;
  });
  return out;
}

/** Reads per-site values (e.g. computed scores) into texel order. */
export function gridFromLookup(get: (coord: string) => number | undefined): Float32Array {
  return Float32Array.from(GRID_COORDS, (coord) => get(coord) ?? NaN);
}

/** Smallest and largest value, ignoring NaN */
export function extent(values: Iterable<number>): [number, number] {
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of values) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  return [lo, hi];
}

const hexToRgb = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

/** Colours values along a scale (stops evenly spaced from min to max). NaN stays transparent. */
export function colorize(values: Float32Array, stops: string[], min?: number, max?: number): RGBA {
  const [dataLo, dataHi] = min === undefined || max === undefined ? extent(values) : [0, 0];
  const lo = min ?? dataLo;
  const hi = max ?? dataHi;
  const rgb = stops.map(hexToRgb);
  const segments = rgb.length - 1;
  const span = hi - lo || 1;
  const out = new Uint8Array(values.length * 4);

  values.forEach((v, i) => {
    if (Number.isNaN(v)) return;
    const t = Math.min(1, Math.max(0, (v - lo) / span)) * segments;
    const k = Math.min(segments - 1, Math.floor(t));
    const f = t - k;
    const a = rgb[k];
    const b = rgb[k + 1];
    out[i * 4] = a[0] + (b[0] - a[0]) * f;
    out[i * 4 + 1] = a[1] + (b[1] - a[1]) * f;
    out[i * 4 + 2] = a[2] + (b[2] - a[2]) * f;
    out[i * 4 + 3] = 255;
  });
  return out;
}

/** One fixed colour per category; unknown categories stay transparent. */
export function categorical(
  mapData: MapData,
  category: (entry: MapDataEntry) => string,
  palette: Record<string, string>,
): RGBA {
  const colors = Object.fromEntries(Object.entries(palette).map(([k, hex]) => [k, hexToRgb(hex)]));
  const out = new Uint8Array(GRID_COORDS.length * 4);
  GRID_COORDS.forEach((coord, i) => {
    const entry = mapData[coord];
    const c = entry && colors[category(entry)];
    if (!c) return;
    out.set([c[0], c[1], c[2], 255], i * 4);
  });
  return out;
}

/** Highlights the given sites in one colour; everything else stays transparent. */
export function mask(sites: ReadonlySet<string>, hex: string): RGBA {
  const [r, g, b] = hexToRgb(hex);
  const out = new Uint8Array(GRID_COORDS.length * 4);
  GRID_COORDS.forEach((coord, i) => {
    if (sites.has(coord)) out.set([r, g, b, 255], i * 4);
  });
  return out;
}

/** CSS gradient for a legend bar or swatch. */
export const cssGradient = (stops: string[]) => `linear-gradient(90deg, ${stops.join(', ')})`;
