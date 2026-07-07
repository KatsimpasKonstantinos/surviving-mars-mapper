export type coordinate = {
    lat: number;
    long: number;
};

export type coordinateString = `${number}$${'N' | 'S'}${number}{'E' | 'W'}`;

export interface MapDataEntry {
    SiteName?: string;
    Altitude?: number | string;
    Temperature?: number | string;
    Topography?: string;
    Difficulty?: number | string;

    DustDevilsBars?: number | string;
    DustStormBars?: number | string;
    MeteorBars?: number | string;
    ColdWaveBars?: number | string;

    MetalsBars?: number | string;
    ConcreteBars?: number | string;
    WaterBars?: number | string;

    MapTemplateID?: string;
}

export type MapData = Record<string, MapDataEntry>;