import { useState, Suspense, lazy, useMemo, useRef } from 'react';
import { Link } from 'react-router';
import imageMars from '../../assets/mars.webp';
import './Map.css';
import type { coordinateString, MapData } from '../../types';
import { offsetCoordinate } from '../../helper';
import { cssGradient, extent, gridValues } from '../../data/heatmap';
import { LAYERS, LAYER_GROUPS, layerPixels, layerStops, type Layer } from '../../data/layers';
import { scoreSites, useWeights } from '../../data/score';
import {
  coordinateSearch,
  LAYER_PARAM,
  PREFS_PARAM,
  useSearchParam,
  VIEW_PARAM,
} from '../../hooks/useUrlSync';
import { useDismiss } from '../../hooks/useDismiss';

// Lazy-load the unified 2D/3D Three.js map so Three.js stays out of the main bundle
const GlobeMap = lazy(() => import('./GlobeMap'));

interface MapProps {
  coordString: coordinateString | null;
  setCoordString: (coordStr: coordinateString | null) => void;
  mapData: MapData | null;
  /** Sites matching the Finder's current filters (null = no filter active) */
  finderMatches: ReadonlySet<string> | null;
}

type ViewMode = '2d' | '3d';

const KEY_DELTAS: Record<string, [number, number]> = {
  ArrowUp: [-1, 0], // north = negative latitude
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
};

/** Small colour sample of a layer's scale */
function Swatch({ layer }: { layer: Layer }) {
  return (
    <span
      className="layer-swatch"
      style={{ background: cssGradient(layerStops(layer)) }}
      aria-hidden="true"
    />
  );
}

/** "Heatmap" button that opens a grouped list of all layers */
function LayerPicker({
  active,
  onSelect,
}: {
  active: string | null;
  onSelect: (name: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useDismiss(rootRef, open, () => setOpen(false));

  const choose = (name: string | null) => {
    onSelect(name);
    setOpen(false);
  };

  const activeLayer = active ? LAYERS[active] : null;

  return (
    <div className="layer-picker" ref={rootRef}>
      <button
        type="button"
        className={`layer-button${activeLayer ? ' has-layer' : ''}`}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {activeLayer ? <Swatch layer={activeLayer} /> : <LayersIcon />}
        <span>{activeLayer ? activeLayer.label : 'Heatmap'}</span>
        <svg className="layer-chevron" viewBox="0 0 24 24" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="layer-panel" role="menu" aria-label="Heatmap layers">
          {LAYER_GROUPS.map((group) => (
            <div className="layer-group" key={group}>
              <div className="layer-group-label">{group}</div>
              <div className="layer-chips">
                {Object.entries(LAYERS)
                  .filter(([, layer]) => layer.group === group)
                  .map(([name, layer]) => (
                    <button
                      key={name}
                      type="button"
                      role="menuitemradio"
                      aria-checked={active === name}
                      className={`layer-chip${active === name ? ' active' : ''}`}
                      onClick={() => choose(active === name ? null : name)}
                    >
                      <Swatch layer={layer} />
                      {layer.label}
                    </button>
                  ))}
              </div>
            </div>
          ))}
          <button
            type="button"
            role="menuitemradio"
            aria-checked={!activeLayer}
            className="layer-none"
            onClick={() => choose(null)}
            disabled={!activeLayer}
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

function Map({ coordString, setCoordString, mapData, finderMatches }: MapProps) {
  const [layerParam, setLayer] = useSearchParam(LAYER_PARAM);
  const [viewParam, setView] = useSearchParam(VIEW_PARAM);
  const activeKey = layerParam && layerParam in LAYERS ? layerParam : null;
  const layer = activeKey ? LAYERS[activeKey] : null;
  const viewMode: ViewMode = viewParam === '2d' ? '2d' : '3d';

  const [overlayOpacity, setOverlayOpacity] = useState<number>(0.7);
  const [hoverCoord, setHoverCoord] = useState<coordinateString | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const weights = useWeights();

  // Only score the sites when the match layer is actually shown
  const scores = useMemo(
    () => (mapData && layer?.kind === 'score' ? scoreSites(mapData, weights) : null),
    [mapData, layer, weights],
  );

  const overlayPixels = useMemo(
    () => (mapData && layer ? layerPixels(layer, { mapData, scores, finderMatches }) : null),
    [mapData, layer, scores, finderMatches],
  );

  // Real min/max for scale layers with a unit (Altitude, Temperature, Challenge)
  const range = useMemo(
    () =>
      mapData && layer?.kind === 'scale' && layer.unit
        ? extent(gridValues(mapData, layer.value))
        : null,
    [mapData, layer],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const delta = KEY_DELTAS[e.key];
    if (!delta) return;
    e.preventDefault();
    const step = e.shiftKey ? 5 : 1;
    const next = offsetCoordinate(coordString ?? '0S0E', delta[0] * step, delta[1] * step);
    if (next) setCoordString(next);
  };

  const unit = layer?.kind === 'scale' ? (layer.unit ?? '') : '';
  const format = (n: number) => `${n.toLocaleString('en-US')}${unit}`;
  const finderLink = { pathname: '/finder', search: coordinateSearch(coordString) };

  return (
    <div className="Map-container card">
      <div className="controls-bar">
        <div className="view-toggle segmented" role="group" aria-label="Map view">
          {(['2d', '3d'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setView(mode === '2d' ? '2d' : null)}
              aria-pressed={viewMode === mode}
            >
              {mode.toUpperCase()}
            </button>
          ))}
        </div>

        <LayerPicker active={activeKey} onSelect={setLayer} />
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
                overlayPixels={overlayPixels}
                overlayOpacity={overlayOpacity}
                onHoverCoordinate={setHoverCoord}
              />
            </Suspense>
          </div>

          {hoverCoord && (
            <div className="map-hud" aria-hidden="true">
              {hoverCoord}
              {scores?.(hoverCoord) !== undefined && <> · match {scores(hoverCoord)}</>}
            </div>
          )}
        </div>

        {/* ---- Active heatmap: legend, opacity and close, right on the map ---- */}
        {layer && (
          <div className="layer-bar" role="group" aria-label={`${layer.label} heatmap`}>
            <span className="layer-bar-name">{layer.label}</span>

            {layer.kind === 'categories' && (
              <div className="legend-swatches">
                {layer.categories.map((c) => (
                  <span key={c.label}>
                    <i style={{ background: c.color }} />
                    {c.label}
                  </span>
                ))}
              </div>
            )}

            {(layer.kind === 'scale' || layer.kind === 'score') && (
              <div className="legend-scale">
                <span>{range ? format(range[0]) : layer.kind === 'score' ? '0' : 'Low'}</span>
                <span className="legend-bar" style={{ background: cssGradient(layer.stops) }} />
                <span>{range ? format(range[1]) : layer.kind === 'score' ? '100' : 'High'}</span>
                {layer.kind === 'score' && (
                  <Link
                    className="layer-bar-link"
                    to={{
                      pathname: '/finder',
                      search: coordinateSearch(coordString, { [PREFS_PARAM]: '1' }),
                    }}
                  >
                    Preferences
                  </Link>
                )}
              </div>
            )}

            {layer.kind === 'finder' && (
              <div className="legend-scale">
                <span className="legend-dot" style={{ background: layer.stops[0] }} />
                <span>
                  {finderMatches
                    ? `${finderMatches.size.toLocaleString('en-US')} matching sites`
                    : 'No Finder filters set'}
                </span>
                <Link className="layer-bar-link" to={finderLink}>
                  {finderMatches ? 'Edit filters' : 'Set filters'}
                </Link>
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
              onClick={() => setLayer(null)}
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
