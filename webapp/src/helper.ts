import type { coordinate, coordinateString } from './types';

export const LAT_LIMIT = 70;
export const LONG_LIMIT = 180;

export const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

export function coordinateTocoordinateString(coordinate: coordinate): coordinateString {
  const latDirection = coordinate.lat >= 0 ? 'S' : 'N';
  const longDirection = coordinate.long >= 0 ? 'E' : 'W';
  const latValue = Math.abs(coordinate.lat);
  const longValue = Math.abs(coordinate.long);

  return `${latValue}${latDirection}${longValue}${longDirection}` as coordinateString;
}

export function coordinateStringTocoordinate(coordStr: coordinateString): coordinate | null {
  if (!coordStr) {
    return null;
  }

  const regex = /(\d+)([NS])(\d+)([WE])/;
  const match = coordStr.match(regex);

  if (!match) {
    return null;
  }

  const [, latValueStr, latDir, longValueStr, longDir] = match;

  let lat = parseInt(latValueStr, 10);
  let long = parseInt(longValueStr, 10);

  if (latDir === 'N') lat = -lat;
  if (longDir === 'W') long = -long;

  return { lat, long };
}

/**
 * Turns loose user input ("12n 45e", "12°N, 45°E", "0n0e") into the canonical
 * coordinate string, or null if it is not a valid landing site.
 */
export function normalizeCoordinateInput(
  input: string | null | undefined,
): coordinateString | null {
  if (!input) return null;
  const cleaned = input.toUpperCase().replace(/[\s°,;/]+/g, '');
  const match = cleaned.match(/^(\d{1,2})([NS])(\d{1,3})([EW])$/);
  if (!match) return null;

  const latValue = parseInt(match[1], 10);
  const longValue = parseInt(match[3], 10);
  if (latValue > LAT_LIMIT || longValue > LONG_LIMIT) return null;

  return coordinateTocoordinateString({
    lat: match[2] === 'N' ? -latValue : latValue,
    long: match[4] === 'W' ? -longValue : longValue,
  });
}

/**
 * Moves a coordinate by a number of degrees. Latitude stops at the map edge,
 * longitude wraps around the planet.
 */
export function offsetCoordinate(
  coordStr: coordinateString,
  dLat: number,
  dLong: number,
): coordinateString | null {
  const c = coordinateStringTocoordinate(coordStr);
  if (!c) return null;
  const lat = clamp(c.lat + dLat, -LAT_LIMIT, LAT_LIMIT);
  // Longitudes -180 and 180 are the same meridian; wrap within [-180, 180).
  const span = LONG_LIMIT * 2;
  const long = ((((c.long + dLong + LONG_LIMIT) % span) + span) % span) - LONG_LIMIT;
  return coordinateTocoordinateString({ lat, long });
}
