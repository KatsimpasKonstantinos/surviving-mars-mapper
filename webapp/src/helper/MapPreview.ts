import Missing from '../assets/Maps/Missing.png';

/** Map template thumbnails, keyed by template id (= file name without extension) */
const MAP_IMAGES: Record<string, string> = Object.fromEntries(
  Object.entries(
    import.meta.glob<string>('../assets/Maps/*.{png,jpg}', { eager: true, import: 'default' }),
  ).map(([path, url]) => [path.slice(path.lastIndexOf('/') + 1, path.lastIndexOf('.')), url]),
);

export function getMapImageSrc(mapName: string): string {
  const src = mapName && mapName !== 'Missing' ? MAP_IMAGES[mapName] : undefined;
  if (!src) {
    if (mapName) console.warn(`Missing map image: ${mapName}`);
    return Missing;
  }
  return src;
}
