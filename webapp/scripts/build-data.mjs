// Converts public/mars_data.csv into the compact binary file the web app loads
// (public/mars_data.bin). Run with `npm run data` whenever the CSV changes.
//
// File layout (gzip-compressed as a whole):
//   "SMM1" | uint32 LE header length | header JSON | zero padding to 8 bytes | columns
// Every column is a little-endian typed array of `count` values that starts at an
// 8-byte aligned offset (relative to the start of the decompressed file).
// Rows are stored in grid order: latitude -70..70 (outer), longitude -180..180 (inner).

import { readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { TechBreakthroughList } from '../src/helper/TechBreakthroughList.ts';
import { computeBreakthroughTiers } from '../src/helper/BreakthroughTiers.ts';
import { coordinateTocoordinateString, LAT_LIMIT, LONG_LIMIT } from '../src/helper.ts';
import { RESOURCES, THREATS } from '../src/data/attributes.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const csvPath = `${root}public/mars_data.csv`;
const outPath = `${root}public/mars_data.bin`;

const LAT_MIN = -LAT_LIMIT,
  LAT_MAX = LAT_LIMIT,
  LONG_MIN = -LONG_LIMIT,
  LONG_MAX = LONG_LIMIT;
const WIDTH = LONG_MAX - LONG_MIN + 1;
const COUNT = (LAT_MAX - LAT_MIN + 1) * WIDTH;

const lines = readFileSync(csvPath, 'utf8').trim().split(/\r?\n/);
const headerRow = lines[0].split(',');
const col = (name) => {
  const i = headerRow.indexOf(name);
  if (i === -1) throw new Error(`CSV column missing: ${name}`);
  return i;
};

// One byte each: the 1–4 bars, then the raw 0–255 values behind them (heatmaps, match).
const ATTRIBUTES = [...RESOURCES, ...THREATS];
const BYTE_COLUMNS = [...ATTRIBUTES.map((a) => a.bars), ...ATTRIBUTES.map((a) => a.raw)];
const DICT_COLUMNS = ['SiteName', 'Topography', 'MapTemplateID'];

/** Index of every CSV column that is read */
const C = Object.fromEntries(
  [
    'Coords',
    'Lat',
    'Long',
    'xxhashShuffleBreakThroughTech',
    'Altitude',
    'Temperature',
    'Difficulty',
    ...BYTE_COLUMNS,
    ...DICT_COLUMNS,
  ].map((n) => [n, col(n)]),
);

const columns = {
  Hash: new BigInt64Array(COUNT),
  Altitude: new Int16Array(COUNT),
  Temperature: new Int8Array(COUNT),
  Difficulty: new Uint16Array(COUNT),
  ...Object.fromEntries(BYTE_COLUMNS.map((n) => [n, new Uint8Array(COUNT)])),
  ...Object.fromEntries(DICT_COLUMNS.map((n) => [n, new Uint8Array(COUNT)])),
  Breakthrough0: new Uint8Array(COUNT),
  Breakthrough1: new Uint8Array(COUNT),
  Breakthrough2: new Uint8Array(COUNT),
};

const dicts = Object.fromEntries(DICT_COLUMNS.map((n) => [n, ['']]));
const dictIndex = (name, value) => {
  let i = dicts[name].indexOf(value);
  if (i === -1) i = dicts[name].push(value) - 1;
  if (i > 255) throw new Error(`Too many distinct values in ${name}`);
  return i;
};

const checkedInt = (value, min, max, what) => {
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) throw new Error(`${what}: ${value} out of range`);
  return n;
};

const seen = new Uint8Array(COUNT);
const started = performance.now();

for (let r = 1; r < lines.length; r++) {
  const f = lines[r].split(',');
  const lat = checkedInt(f[C.Lat], LAT_MIN, LAT_MAX, 'Lat');
  const long = checkedInt(f[C.Long], LONG_MIN, LONG_MAX, 'Long');
  const i = (lat - LAT_MIN) * WIDTH + (long - LONG_MIN);

  const expectedCoords = coordinateTocoordinateString({ lat, long });
  if (f[C.Coords].trim() !== expectedCoords) {
    throw new Error(`Row ${r}: Coords ${f[C.Coords]} does not match lat/long (${expectedCoords})`);
  }
  if (seen[i]) throw new Error(`Duplicate coordinate ${expectedCoords}`);
  seen[i] = 1;

  const hash = BigInt(f[C.xxhashShuffleBreakThroughTech]);
  columns.Hash[i] = hash;
  columns.Altitude[i] = checkedInt(f[C.Altitude], -32768, 32767, 'Altitude');
  columns.Temperature[i] = checkedInt(f[C.Temperature], -128, 127, 'Temperature');
  columns.Difficulty[i] = checkedInt(f[C.Difficulty], 0, 65535, 'Difficulty');
  for (const n of BYTE_COLUMNS) columns[n][i] = checkedInt(f[C[n]], 0, 255, n);
  for (const n of DICT_COLUMNS) columns[n][i] = dictIndex(n, f[C[n]].trim());

  const [firstTier] = computeBreakthroughTiers(hash);
  firstTier.forEach((tech, k) => {
    const idx = TechBreakthroughList.indexOf(tech);
    if (idx === -1) throw new Error(`Unknown breakthrough ${tech}`);
    columns[`Breakthrough${k}`][i] = idx;
  });
}

if (seen.some((v) => v === 0)) throw new Error('CSV does not cover the full coordinate grid');

// ---- Serialise ----
const align8 = (n) => Math.ceil(n / 8) * 8;
const columnEntries = Object.entries(columns);
const typeName = (arr) => arr.constructor.name.replace('Array', '');

// Header size depends on the offsets it contains, so iterate until stable.
let header,
  headerBytes,
  dataStart = 0;
for (let pass = 0; pass < 5; pass++) {
  let offset = dataStart;
  const layout = columnEntries.map(([name, arr]) => {
    const entry = { name, type: typeName(arr), offset };
    offset = align8(offset + arr.byteLength);
    return entry;
  });
  header = {
    version: 1,
    count: COUNT,
    lat: [LAT_MIN, LAT_MAX],
    long: [LONG_MIN, LONG_MAX],
    dicts: { ...dicts, Breakthrough: TechBreakthroughList },
    columns: layout,
    byteLength: offset,
  };
  headerBytes = Buffer.from(JSON.stringify(header), 'utf8');
  const nextStart = align8(8 + headerBytes.length);
  if (nextStart === dataStart) break;
  dataStart = nextStart;
}

const out = Buffer.alloc(header.byteLength);
out.write('SMM1', 0, 'ascii');
out.writeUInt32LE(headerBytes.length, 4);
headerBytes.copy(out, 8);
for (const [i, [, arr]] of columnEntries.entries()) {
  Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength).copy(out, header.columns[i].offset);
}

const gz = gzipSync(out, { level: 9 });
writeFileSync(outPath, gz);

const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
console.log(
  `mars_data.bin: ${COUNT} sites, ${kb(out.length)} raw, ${kb(gz.length)} gzipped ` +
    `(${((performance.now() - started) / 1000).toFixed(1)}s)`,
);
