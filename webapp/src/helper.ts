import type { coordinate, coordinateString } from './types'

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

    let [, latValueStr, latDir, longValueStr, longDir] = match;

    let lat = parseInt(latValueStr, 10);
    let long = parseInt(longValueStr, 10);

    if (latDir === 'N') lat = -lat;
    if (longDir === 'W') long = -long;

    return { lat, long };
}