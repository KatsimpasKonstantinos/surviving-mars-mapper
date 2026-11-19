import { useState, Suspense, lazy, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router';
import imageMars from '../../assets/mars.webp';
import './Map.css';
import type { coordinateString, MapData } from '../../types';
import { offsetCoordinate } from '../../helper';

// Lazy-load the unified 2D/3D Three.js map so Three.js stays out of the main bundle
const GlobeMap = lazy(() => import('./GlobeMap'));

interface MapProps {
  coordString: coordinateString | null;
  setCoordString: (coordStr: coordinateString | null) => void;
  mapData: MapData | null;
}

type ViewMode = '2d' | '3d';

/**
 * Heatmap overlays and their colour scales. The gradients mirror the matplotlib
 * colormaps used by Data-extraction/csv2heatmap.py.
 */
const OVERLAYS: Record<
  string,
  { gradient: string; low: string; high: string; range?: 'Altitude' | 'Temperature' | 'Difficulty' }
> = {
  Altitude: {
    gradient: '#ffffff, #ffff00 25%, #ff0000 62%, #0b0000',
    low: 'Low',
    high: 'High',
    range: 'Altitude',
  },
  Temperature: {
    gradient: '#3b4cc0, #dddddd, #b40426',
    low: 'Cold',
    high: 'Warm',
    range: 'Temperature',
  },
  Topography: { gradient: '', low: '', high: '' },
  Difficulty: {
    gradient: '#fcffa4, #f98e09, #bc3754, #57106e, #000004',
    low: 'Easy',
    high: 'Hard',
    range: 'Difficulty',
  },
  DustDevils: { gradient: '#fff5eb, #fd8d3c, #7f2704', low: 'Low', high: 'High' },
  DustStorm: { gradient: '#fff7ec, #fc8d59, #7f0000', low: 'Low', high: 'High' },
  Meteor: { gradient: '#fff5f0, #fb6a4a, #67000d', low: 'Low', high: 'High' },
  ColdWave: { gradient: '#fcfbfd, #9e9ac8, #3f007d', low: 'Low', high: 'High' },
  Metals: { gradient: '#ffffe5, #fe9929, #662506', low: 'Low', high: 'High' },
  Concrete: { gradient: '#ffffff, #969696, #000000', low: 'Low', high: 'High' },
  Water: { gradient: '#f7fbff, #6baed6, #08306b', low: 'Low', high: 'High' },
};

const OVERLAY_LABELS: Record<string, string> = {
  DustDevils: 'Dust Devils',
  DustStorm: 'Dust Storms',
  Meteor: 'Meteors',
  ColdWave: 'Cold Waves',
};

const TOPOGRAPHY_SWATCHES = [
  { label: 'Steep', color: '#440154' },
  { label: 'Rough', color: '#21918c' },
  { label: 'Mountainous', color: '#fde725' },
];

const RANGE_UNITS = { Altitude: ' m', Temperature: '°C', Difficulty: '%' } as const;

const KEY_DELTAS: Record<string, [number, number]> = {
  ArrowUp: [-1, 0], // north = negative latitude
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
};

function Map({ coordString, setCoordString, mapData }: MapProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const layerParam = searchParams.get('layer');
  const activeOverlay = layerParam && layerParam in OVERLAYS ? layerParam : 'None';
  const viewMode: ViewMode = searchParams.get('view') === '2d' ? '2d' : '3d';

  const [overlayOpacity, setOverlayOpacity] = useState<number>(0.7);
  const [hoverCoord, setHoverCoord] = useState<coordinateString | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const updateParam = (key: string, value: string | null) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );
  };

  // Min/max of the numeric heatmaps, for the legend labels.
  const ranges = useMemo(() => {
    if (!mapData) return null;
    const r = {
      Altitude: [Infinity, -Infinity],
      Temperature: [Infinity, -Infinity],
      Difficulty: [Infinity, -Infinity],
    } as Record<keyof typeof RANGE_UNITS, [number, number]>;
    for (const entry of Object.values(mapData)) {
      for (const k of Object.keys(r) as (keyof typeof RANGE_UNITS)[]) {
        r[k][0] = Math.min(r[k][0], entry[k]);
        r[k][1] = Math.max(r[k][1], entry[k]);
      }
    }
    return r;
  }, [mapData]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const delta = KEY_DELTAS[e.key];
    if (!delta) return;
    e.preventDefault();
    const step = e.shiftKey ? 5 : 1;
    const next = offsetCoordinate(coordString ?? '0S0E', delta[0] * step, delta[1] * step);
    if (next) setCoordString(next);
  };

  const overlay = activeOverlay !== 'None' ? OVERLAYS[activeOverlay] : null;
  const range = overlay?.range && ranges ? ranges[overlay.range] : null;
  const unit = overlay?.range ? RANGE_UNITS[overlay.range] : '';

  return (
    <div className="Map-container card">
      <div className="controls-bar">
        <div className="view-toggle" role="group" aria-label="Map view">
          {(['2d', '3d'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              className={`view-toggle-btn${viewMode === mode ? ' active' : ''}`}
              onClick={() => updateParam('view', mode === '2d' ? '2d' : null)}
              aria-pressed={viewMode === mode}
            >
              {mode.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="control-group">
          <label htmlFor="overlay-select">Heatmap:</label>
          <select
            id="overlay-select"
            className="overlay-dropdown"
            value={activeOverlay}
            onChange={(e) =>
              updateParam('layer', e.target.value === 'None' ? null : e.target.value)
            }
          >
            <option value="None">None (Base Map)</option>
            {Object.keys(OVERLAYS).map((name) => (
              <option key={name} value={name}>
                {OVERLAY_LABELS[name] ?? name}
              </option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label htmlFor="opacity-slider">Opacity:</label>
          <input
            id="opacity-slider"
            className="opacity-slider"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={overlayOpacity}
            onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
            disabled={activeOverlay === 'None'}
          />
        </div>
      </div>

      {/* ---- Unified 2D/3D Map Stage ---- */}
      <div
        ref={stageRef}
        className="map-stage"
        tabIndex={0}
        role="application"
        aria-label="Mars map. Click to select a landing site, or use the arrow keys to move the selection (Shift moves 5°)."
        onKeyDown={handleKeyDown}
        onPointerDown={() => stageRef.current?.focus({ preventScroll: true })}
      >
        {/* Hidden sizer image keeps the stage's exact intrinsic aspect ratio */}
        <img className="map-sizer" src={imageMars} alt="" aria-hidden="true" draggable="false" />

        <div className="map-canvas-layer">
          <Suspense
            fallback={
              <div className="globe-loading">
                <span className="globe-loading-text">Initialising Map…</span>
              </div>
            }
          >
            <GlobeMap
              viewMode={viewMode}
              coordString={coordString}
              setCoordString={setCoordString}
              activeOverlay={activeOverlay}
              overlayOpacity={overlayOpacity}
              onHoverCoordinate={setHoverCoord}
            />
          </Suspense>
        </div>

        {hoverCoord && (
          <div className="map-hud" aria-hidden="true">
            {hoverCoord}
          </div>
        )}
      </div>

      {activeOverlay !== 'None' && (
        <div
          className="map-legend"
          aria-label={`${OVERLAY_LABELS[activeOverlay] ?? activeOverlay} legend`}
        >
          {activeOverlay === 'Topography' ? (
            <div className="legend-swatches">
              {TOPOGRAPHY_SWATCHES.map((s) => (
                <span key={s.label}>
                  <i style={{ background: s.color }} />
                  {s.label}
                </span>
              ))}
              <span>
                <i className="legend-empty" />
                Very Flat (no overlay)
              </span>
            </div>
          ) : (
            overlay && (
              <>
                <span className="legend-label">
                  {range ? `${range[0].toLocaleString('en-US')}${unit}` : overlay.low}
                </span>
                <span
                  className="legend-bar"
                  style={{ background: `linear-gradient(90deg, ${overlay.gradient})` }}
                />
                <span className="legend-label">
                  {range ? `${range[1].toLocaleString('en-US')}${unit}` : overlay.high}
                </span>
              </>
            )
          )}
        </div>
      )}
    </div>
  );
}

export default Map;
