import type { MapData, MapDataEntry } from '../types';
import { coordinateTocoordinateString } from '../helper';

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
  if (bytes[0] !== 0x1f || bytes[1] !== 0x8b) return bytes.slice().buffer as ArrayBuffer;
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

  const cols: Record<string, ArrayLike<number | bigint>> = {};
  for (const { name, type, offset } of header.columns) {
    const Ctor = TYPED_ARRAYS[type as keyof typeof TYPED_ARRAYS];
    if (!Ctor) throw new Error(`mars_data.bin: unsupported column type ${type}`);
    cols[name] = new Ctor(buffer, offset, header.count);
  }

  const num = (name: string, i: number) => cols[name][i] as number;
  const { dicts } = header;
  const [latMin, latMax] = header.lat;
  const [longMin, longMax] = header.long;

  const data: MapData = {};
  let i = 0;
  for (let lat = latMin; lat <= latMax; lat++) {
    for (let long = longMin; long <= longMax; long++, i++) {
      const entry: MapDataEntry = {
        SiteName: dicts.SiteName[num('SiteName', i)],
        Topography: dicts.Topography[num('Topography', i)],
        MapTemplateID: dicts.MapTemplateID[num('MapTemplateID', i)],
        Altitude: num('Altitude', i),
        Temperature: num('Temperature', i),
        Difficulty: num('Difficulty', i),
        MetalsBars: num('MetalsBars', i),
        ConcreteBars: num('ConcreteBars', i),
        WaterBars: num('WaterBars', i),
        DustDevilsBars: num('DustDevilsBars', i),
        DustStormBars: num('DustStormBars', i),
        MeteorBars: num('MeteorBars', i),
        ColdWaveBars: num('ColdWaveBars', i),
        xxhashShuffleBreakThroughTech: (cols.Hash[i] as bigint).toString(),
        FirstBreakthroughs: [
          dicts.Breakthrough[num('Breakthrough0', i)],
          dicts.Breakthrough[num('Breakthrough1', i)],
          dicts.Breakthrough[num('Breakthrough2', i)],
        ],
      };
      data[coordinateTocoordinateString({ lat, long })] = entry;
    }
  }
  return data;
}

let pending: Promise<MapData> | null = null;
let lastProgress = 0;
const progressListeners = new Set<(percent: number) => void>();

function reportProgress(percent: number) {
  lastProgress = percent;
  progressListeners.forEach((listener) => listener(percent));
}

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

/** Downloads and decodes the site database once; later calls share the same promise. */
export function loadMarsData(): Promise<MapData> {
  pending ??= (async () => {
    // Low priority: the page's own code, styles and the globe texture come first.
    const response = await fetch('/mars_data.bin', { priority: 'low' });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const bytes = await readWithProgress(response, reportProgress);
    const buffer = await gunzipIfNeeded(bytes);
    await afterNextPaint();
    performance.mark('mars-data:decode-start');
    const data = decode(buffer);
    performance.measure('mars-data:decode', 'mars-data:decode-start');
    reportProgress(100);
    return data;
  })();
  pending.catch(() => {
    pending = null;
  });
  return pending;
}

/** Subscribes to download progress (0–100). Returns an unsubscribe function. */
export function onMarsDataProgress(listener: (percent: number) => void): () => void {
  progressListeners.add(listener);
  listener(lastProgress);
  return () => progressListeners.delete(listener);
}
