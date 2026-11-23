import { describe, expect, test } from 'vite-plus/test';
import {
  coordinateStringTocoordinate,
  coordinateTocoordinateString,
  normalizeCoordinateInput,
  offsetCoordinate,
} from '../src/helper';
import { parseSites } from '../src/data/compare';
import type { coordinateString } from '../src/types';

describe('coordinates', () => {
  test('north and west are negative', () => {
    expect(coordinateStringTocoordinate('12N45E')).toEqual({ lat: -12, long: 45 });
    expect(coordinateStringTocoordinate('70S180W')).toEqual({ lat: 70, long: -180 });
    expect(coordinateTocoordinateString({ lat: -12, long: 45 })).toBe('12N45E');
    expect(coordinateTocoordinateString({ lat: 0, long: 0 })).toBe('0S0E');
  });

  test('round-trips every site', () => {
    for (let lat = -70; lat <= 70; lat += 7) {
      for (let long = -180; long <= 180; long += 9) {
        const s = coordinateTocoordinateString({ lat, long });
        expect(coordinateStringTocoordinate(s)).toEqual({ lat, long });
      }
    }
  });

  test.each([
    ['12n 45e', '12N45E'],
    ['12°N, 45°E', '12N45E'],
    [' 3 s / 170 w ', '3S170W'],
    ['0n0e', '0S0E'],
  ])('normalizes %j', (input, expected) => {
    expect(normalizeCoordinateInput(input)).toBe(expected);
  });

  test.each(['', '71N0E', '0N181E', '12X45E', 'abc', null, undefined])('rejects %j', (input) => {
    expect(normalizeCoordinateInput(input)).toBeNull();
  });

  test('offset stops at the poles and wraps around in longitude', () => {
    expect(offsetCoordinate('69N0E', 5, 0)).toBe('64N0E');
    expect(offsetCoordinate('69N0E', -5, 0)).toBe('70N0E');
    expect(offsetCoordinate('0S179E', 0, 3)).toBe('0S178W');
    expect(offsetCoordinate('0S179W', 0, -3)).toBe('0S178E');
  });

  test('compare list parsing keeps valid unique sites, at most four', () => {
    expect(parseSites('12n45e, 12N45E,bogus,1S1E,2S2E,3S3E,4S4E')).toEqual<coordinateString[]>([
      '12N45E',
      '1S1E',
      '2S2E',
      '3S3E',
    ]);
    expect(parseSites(null)).toEqual([]);
  });
});
