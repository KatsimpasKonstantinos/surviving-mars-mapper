import { describe, expect, test } from 'vite-plus/test';
import {
  colorize,
  coordinateToUv,
  GRID_COORDS,
  GRID_HEIGHT,
  GRID_WIDTH,
  mask,
  OVERLAY_V_MAX,
  OVERLAY_V_MIN,
  uvToCoordinate,
} from '../src/data/heatmap';
import { coordinateStringTocoordinate, coordinateTocoordinateString } from '../src/helper';
import type { coordinateString } from '../src/types';

const pixel = (rgba: Uint8Array, i: number) => Array.from(rgba.subarray(i * 4, i * 4 + 4));

describe('heatmap', () => {
  test('grid covers every site once, row 0 = 70S, column 0 = 180W', () => {
    expect(GRID_COORDS).toHaveLength(GRID_WIDTH * GRID_HEIGHT);
    expect(new Set(GRID_COORDS).size).toBe(GRID_COORDS.length);
    expect(GRID_COORDS[0]).toBe('70S180W');
    expect(GRID_COORDS[GRID_WIDTH - 1]).toBe('70S180E');
    expect(GRID_COORDS.at(-1)).toBe('70N180E');
  });

  test('colorize maps min and max to the end stops and interpolates between', () => {
    const rgba = colorize(new Float32Array([0, 5, 10]), ['#000000', '#ff0000', '#ffffff']);
    expect(pixel(rgba, 0)).toEqual([0, 0, 0, 255]);
    expect(pixel(rgba, 1)).toEqual([255, 0, 0, 255]);
    expect(pixel(rgba, 2)).toEqual([255, 255, 255, 255]);
  });

  test('colorize clamps to a fixed range and leaves NaN transparent', () => {
    const rgba = colorize(new Float32Array([-5, Number.NaN, 50]), ['#000000', '#ffffff'], 0, 10);
    expect(pixel(rgba, 0)).toEqual([0, 0, 0, 255]);
    expect(pixel(rgba, 1)).toEqual([0, 0, 0, 0]);
    expect(pixel(rgba, 2)).toEqual([255, 255, 255, 255]);
  });

  test('mask colours only the given sites', () => {
    const rgba = mask(new Set(['70S180W']), '#ffff00');
    expect(pixel(rgba, 0)).toEqual([255, 255, 0, 255]);
    expect(pixel(rgba, 1)).toEqual([0, 0, 0, 0]);
  });

  test('the marker sits in the centre of its own heatmap cell, for every site', () => {
    GRID_COORDS.forEach((coord, i) => {
      const { u, v } = coordinateToUv(coordinateStringTocoordinate(coord as coordinateString)!);
      const col = i % GRID_WIDTH;
      const row = Math.floor(i / GRID_WIDTH);
      // Texel the shader samples at the marker position (half a texel from each edge)
      const band = (v - OVERLAY_V_MIN) / (OVERLAY_V_MAX - OVERLAY_V_MIN);
      expect(u * GRID_WIDTH - col).toBeCloseTo(0.5, 9);
      expect(band * GRID_HEIGHT - row).toBeCloseTo(0.5, 9);
      // …and clicking there selects that same site
      expect(coordinateTocoordinateString(uvToCoordinate(u, v))).toBe(coord);
    });
  });

  test('clicking anywhere inside a cell, even at its edges, selects that cell', () => {
    const cellW = 1 / GRID_WIDTH;
    const cellH = (OVERLAY_V_MAX - OVERLAY_V_MIN) / GRID_HEIGHT;
    for (const coord of ['70S180W', '0S0E', '12N45E', '70N180E', '35S90W'] as coordinateString[]) {
      const { u, v } = coordinateToUv(coordinateStringTocoordinate(coord)!);
      for (const du of [-0.49, 0, 0.49]) {
        for (const dv of [-0.49, 0, 0.49]) {
          const picked = uvToCoordinate(u + du * cellW, v + dv * cellH);
          expect(coordinateTocoordinateString(picked)).toBe(coord);
        }
      }
    }
  });

  test('outside the heatmap band clicks clamp to the nearest row', () => {
    expect(uvToCoordinate(0.5, 0)).toEqual(uvToCoordinate(0.5, OVERLAY_V_MIN + 1e-6));
    expect(uvToCoordinate(1, 1)).toEqual({ lat: -70, long: 180 });
  });
});
