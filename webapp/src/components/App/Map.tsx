import { useState, Suspense, lazy, useMemo, useRef, useEffect } from 'react';
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
type RangeKey = 'Altitude' | 'Temperature' | 'Difficulty';

const TOPOGRAPHY_SWATCHES = [
  { label: 'Steep', color: '#440154' },
  { label: 'Rough', color: '#21918c' },
  { label: 'Mountainous', color: '#fde725' },
];

/**
 * Heatmap overlays and their colour scales. The gradients mirror the matplotlib
 * colormaps used by Data-extraction/csv2heatmap.py.
 */
const OVERLAYS: Record<
  string,
  { label: string; gradient: string; low: string; high: string; range?: RangeKey }
> = {
  Altitude: {
    label: 'Altitude',
    gradient: '#ffffff, #ffff00 25%, #ff0000 62%, #0b0000',
    low: 'Low',
    high: 'High',
    range: 'Altitude',
  },
  Temperature: {
    label: 'Temperature',
    gradient: '#3b4cc0, #dddddd, #b40426',
    low: 'Cold',
    high: 'Warm',
    range: 'Temperature',
  },
  Topography: {
    label: 'Terrain',
    gradient: TOPOGRAPHY_SWATCHES.map((s) => s.color).join(', '),
    low: '',
    high: '',
  },
  Difficulty: {
    label: 'Challenge',
    gradient: '#fcffa4, #f98e09, #bc3754, #57106e, #000004',
    low: 'Easy',
    high: 'Hard',
    range: 'Difficulty',
  },
  DustDevils: {
    label: 'Dust Devils',
    gradient: '#fff5eb, #fd8d3c, #7f2704',
    low: 'Low',
    high: 'High',
  },
  DustStorm: {
    label: 'Dust Storms',
    gradient: '#fff7ec, #fc8d59, #7f0000',
    low: 'Low',
    high: 'High',
  },
  Meteor: { label: 'Meteors', gradient: '#fff5f0, #fb6a4a, #67000d', low: 'Low', high: 'High' },
  ColdWave: {
    label: 'Cold Waves',
    gradient: '#fcfbfd, #9e9ac8, #3f007d',
    low: 'Low',
    high: 'High',
  },
  Metals: { label: 'Metals', gradient: '#ffffe5, #fe9929, #662506', low: 'Low', high: 'High' },
  Concrete: { label: 'Concrete', gradient: '#ffffff, #969696, #000000', low: 'Low', high: 'High' },
  Water: { label: 'Water', gradient: '#f7fbff, #6baed6, #08306b', low: 'Low', high: 'High' },
};

/** The same grouping as the info cards next to the map */
const OVERLAY_GROUPS = [
  { label: 'Terrain', items: ['Altitude', 'Temperature', 'Topography', 'Difficulty'] },
  { label: 'Threats', items: ['DustDevils', 'DustStorm', 'Meteor', 'ColdWave'] },
  { label: 'Resources', items: ['Metals', 'Concrete', 'Water'] },
];

const RANGE_UNITS: Record<RangeKey, string> = {
  Altitude: ' m',
  Temperature: '°C',
  Difficulty: '%',
};

const KEY_DELTAS: Record<string, [number, number]> = {
  ArrowUp: [-1, 0], // north = negative latitude
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
};

/** Small colour sample of a heatmap's scale */
function Swatch({ name }: { name: string }) {
  const gradient = OVERLAYS[name]?.gradient;
  return (
    <span
      className="layer-swatch"
      style={gradient ? { background: `linear-gradient(90deg, ${gradient})` } : undefined}
      aria-hidden="true"
    />
  );
}

/** "Heatmap" button that opens a grouped list of all layers */
function LayerPicker({
  active,
  onSelect,
}: {
  active: string;
  onSelect: (name: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const choose = (name: string | null) => {
    onSelect(name);
    setOpen(false);
  };

  const hasLayer = active !== 'None';

  return (
    <div className="layer-picker" ref={rootRef}>
      <button
        type="button"
        className={`layer-button${hasLayer ? ' has-layer' : ''}`}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {hasLayer ? <Swatch name={active} /> : <LayersIcon />}
        <span>{hasLayer ? OVERLAYS[active].label : 'Heatmap'}</span>
        <svg className="layer-chevron" viewBox="0 0 24 24" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="layer-panel" role="menu" aria-label="Heatmap layers">
          {OVERLAY_GROUPS.map((group) => (
            <div className="layer-group" key={group.label}>
              <div className="layer-group-label">{group.label}</div>
              <div className="layer-chips">
                {group.items.map((name) => (
                  <button
                    key={name}
                    type="button"
                    role="menuitemradio"
                    aria-checked={active === name}
                    className={`layer-chip${active === name ? ' active' : ''}`}
                    onClick={() => choose(active === name ? null : name)}
                  >
                    <Swatch name={name} />
                    {OVERLAYS[name].label}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <button
            type="button"
            role="menuitemradio"
            aria-checked={!hasLayer}
            className="layer-none"
            onClick={() => choose(null)}
            disabled={!hasLayer}
          >
            No heatmap
          </button>
        </div>
      )}
    </div>
  );
}

function LayersIcon() {
  return (
    <svg className="layer-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="m3 13 9 5 9-5" />
    </svg>
  );
}

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
    const r: Record<RangeKey, [number, number]> = {
      Altitude: [Infinity, -Infinity],
      Temperature: [Infinity, -Infinity],
      Difficulty: [Infinity, -Infinity],
    };
    for (const entry of Object.values(mapData)) {
      for (const k of Object.keys(r) as RangeKey[]) {
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
  const format = (n: number) => `${n.toLocaleString('en-US')}${unit}`;

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

        <LayerPicker active={activeOverlay} onSelect={(name) => updateParam('layer', name)} />
      </div>

      {/* ---- Unified 2D/3D Map Stage ---- */}
      <div className="map-stage-wrap">
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

        {/* ---- Active heatmap: legend, opacity and close, right on the map ---- */}
        {overlay && (
          <div className="layer-bar" role="group" aria-label={`${overlay.label} heatmap`}>
            <span className="layer-bar-name">{overlay.label}</span>

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
                  Very Flat
                </span>
              </div>
            ) : (
              <div className="legend-scale">
                <span>{range ? format(range[0]) : overlay.low}</span>
                <span
                  className="legend-bar"
                  style={{ background: `linear-gradient(90deg, ${overlay.gradient})` }}
                />
                <span>{range ? format(range[1]) : overlay.high}</span>
              </div>
            )}

            <label className="opacity-control">
              <span className="visually-hidden">Heatmap opacity</span>
              <input
                className="opacity-slider"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={overlayOpacity}
                onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                style={{ '--fill': `${overlayOpacity * 100}%` } as React.CSSProperties}
              />
              <output>{Math.round(overlayOpacity * 100)}%</output>
            </label>

            <button
              type="button"
              className="layer-bar-close"
              onClick={() => updateParam('layer', null)}
              aria-label="Hide heatmap"
              title="Hide heatmap"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Map;
