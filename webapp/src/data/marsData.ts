import type { MapData, MapDataEntry } from '../types';
import { coordinateTocoordinateString } from '../helper';
import { createStore } from './store';

// Reader for public/mars_data.bin (written by scripts/build-data.mjs; see there for the layout).

interface Header {
  version: number;
  count: number;
  lat: [number, number];
  long: [number, number];
  dicts: Record<'SiteName' | 'Topography' | 'MapTemplateID' | 'Breakthrough', string[]>;
  columns: { name: string; type: string; offset: number }[];
}

const TYPED_ARRAYS = {
  BigInt64: BigInt64Array,
  Int16: Int16Array,
  Int8: Int8Array,
  Uint16: Uint16Array,
  Uint8: Uint8Array,
} as const;

async function readWithProgress(
  response: Response,
  onProgress: (percent: number) => void,
): Promise<Uint8Array> {
  const total = Number(response.headers.get('content-length')) || 0;
  const reader = response.body?.getReader();
  if (!reader) return new Uint8Array(await response.arrayBuffer());

  const chunks: Uint8Array[] = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    if (total > 0) onProgress(Math.min(99, Math.round((loaded / total) * 100)));
  }

  const bytes = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}

async function gunzipIfNeeded(bytes: Uint8Array): Promise<ArrayBuffer> {
  // Some servers transparently decode .gz payloads; only decompress when the gzip magic is present.
  if (bytes[0] !== 0x1f || bytes[1] !== 0x8b) {
    const whole = bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength;
    return (whole ? bytes.buffer : bytes.slice().buffer) as ArrayBuffer;
  }
  const stream = new Blob([bytes as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).arrayBuffer();
}

function decode(buffer: ArrayBuffer): MapData {
  const view = new DataView(buffer);
  const magic = String.fromCharCode(...new Uint8Array(buffer, 0, 4));
  if (magic !== 'SMM1') throw new Error('mars_data.bin: unknown file format');

  const headerLength = view.getUint32(4, true);
  const header: Header = JSON.parse(
    new TextDecoder().decode(new Uint8Array(buffer, 8, headerLength)),
  );

  const cols: Record<string, ArrayLike<number>> = {};
  let hashes: BigInt64Array | null = null;
  for (const { name, type, offset } of header.columns) {
    const Ctor = TYPED_ARRAYS[type as keyof typeof TYPED_ARRAYS];
    if (!Ctor) throw new Error(`mars_data.bin: unsupported column type ${type}`);
    const column = new Ctor(buffer, offset, header.count);
    if (column instanceof BigInt64Array) hashes = column;
    else cols[name] = column;
  }
  if (!hashes) throw new Error('mars_data.bin: no Hash column');

  // Column arrays read once here: 50,901 entries × 22 fields is the hot loop of startup.
  const {
    SiteName,
    Topography,
    MapTemplateID,
    Altitude,
    Temperature,
    Difficulty,
    MetalsBars,
    ConcreteBars,
    WaterBars,
    DustDevilsBars,
    DustStormBars,
    MeteorBars,
    ColdWaveBars,
    Metals,
    Concrete,
    Water,
    DustDevils,
    DustStorm,
    Meteor,
    ColdWave,
    Breakthrough0,
    Breakthrough1,
    Breakthrough2,
  } = cols;
  const { dicts } = header;
  const [latMin, latMax] = header.lat;
  const [longMin, longMax] = header.long;

  const data: MapData = {};
  let i = 0;
  for (let lat = latMin; lat <= latMax; lat++) {
    for (let long = longMin; long <= longMax; long++, i++) {
      const entry: MapDataEntry = {
        SiteName: dicts.SiteName[SiteName[i]],
        Topography: dicts.Topography[Topography[i]],
        MapTemplateID: dicts.MapTemplateID[MapTemplateID[i]],
        Altitude: Altitude[i],
        Temperature: Temperature[i],
        Difficulty: Difficulty[i],
        MetalsBars: MetalsBars[i],
        ConcreteBars: ConcreteBars[i],
        WaterBars: WaterBars[i],
        DustDevilsBars: DustDevilsBars[i],
        DustStormBars: DustStormBars[i],
        MeteorBars: MeteorBars[i],
        ColdWaveBars: ColdWaveBars[i],
        Metals: Metals[i],
        Concrete: Concrete[i],
        Water: Water[i],
        DustDevils: DustDevils[i],
        DustStorm: DustStorm[i],
        Meteor: Meteor[i],
        ColdWave: ColdWave[i],
        xxhashShuffleBreakThroughTech: hashes[i].toString(),
        FirstBreakthroughs: [
          dicts.Breakthrough[Breakthrough0[i]],
          dicts.Breakthrough[Breakthrough1[i]],
          dicts.Breakthrough[Breakthrough2[i]],
        ],
      };
      data[coordinateTocoordinateString({ lat, long })] = entry;
    }
  }
  return data;
}

let pending: Promise<MapData> | null = null;
/** Download progress, 0–100 */
const progress = createStore(0);
export const useMarsDataProgress = progress.useValue;

/**
 * Resolves once the browser has painted a frame, so that decoding the data never
 * delays the first visible page. The timeout covers background tabs, where
 * requestAnimationFrame is paused.
 */
function afterNextPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => setTimeout(resolve, 0));
    setTimeout(resolve, 100);
  });
}

/** Decodes the raw (optionally gzipped) bytes of mars_data.bin */
export async function parseMarsData(bytes: Uint8Array): Promise<MapData> {
  return decode(await gunzipIfNeeded(bytes));
}

/** Downloads and decodes the site database once; later calls share the same promise. */
export function loadMarsData(): Promise<MapData> {
  pending ??= (async () => {
    // Low priority: the page's own code, styles and the globe texture come first.
    const response = await fetch('/mars_data.bin', { priority: 'low' });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const bytes = await readWithProgress(response, progress.set);
    const buffer = await gunzipIfNeeded(bytes);
    await afterNextPaint();
    performance.mark('mars-data:decode-start');
    const data = decode(buffer);
    performance.measure('mars-data:decode', 'mars-data:decode-start');
    progress.set(100);
    return data;
  })();
  pending.catch(() => {
    pending = null;
  });
  return pending;
}
