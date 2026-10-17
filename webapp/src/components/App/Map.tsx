import { useState, Suspense, lazy } from 'react';
import imageMars from '../../assets/mars.webp';
import './Map.css';
import type { coordinateString } from '../../types';

// Lazy-load the unified 2D/3D Three.js map so Three.js stays out of the main bundle
const GlobeMap = lazy(() => import('./GlobeMap'));

interface MapProps {
    coordString: coordinateString | null;
    setCoordString: (coordStr: coordinateString | null) => void;
}

const MAP_OVERLAYS = [
    "None",
    "Altitude", "Temperature", "Topography", "Difficulty",
    "DustDevils", "DustStorm", "Meteor", "ColdWave",
    "Metals", "Concrete", "Water",
];

function Map({ coordString, setCoordString }: MapProps) {
    const [activeOverlay, setActiveOverlay] = useState<string>("None");
    const [overlayOpacity, setOverlayOpacity] = useState<number>(0.70);
    const [viewMode, setViewMode] = useState<'2d' | '3d'>('3d');

    return (
        <div className="Map-container">
            <div className="controls-bar">
                {/* ---- View Mode Toggle ---- */}
                <div className="view-toggle">
                    <button
                        className={`view-toggle-btn${viewMode === '2d' ? ' active' : ''}`}
                        onClick={() => setViewMode('2d')}
                        aria-pressed={viewMode === '2d'}
                    >
                        2D
                    </button>
                    <button
                        className={`view-toggle-btn${viewMode === '3d' ? ' active' : ''}`}
                        onClick={() => setViewMode('3d')}
                        aria-pressed={viewMode === '3d'}
                    >
                        3D
                    </button>
                </div>

                <div className="control-group">
                    <label htmlFor="overlay-select">Map:</label>
                    <select
                        id="overlay-select"
                        className="overlay-dropdown"
                        value={activeOverlay}
                        onChange={(e) => setActiveOverlay(e.target.value)}
                    >
                        {MAP_OVERLAYS.map(overlay => (
                            <option key={overlay} value={overlay}>
                                {overlay === "None" ? "None (Base Map)" : overlay}
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
                        min="0" max="1" step="0.01"
                        value={overlayOpacity}
                        onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                        disabled={activeOverlay === "None"}
                    />
                </div>
            </div>

            {/* ---- Unified 2D/3D Map Stage ---- */}
            <div className="map-stage">
                {/* Hidden sizer image keeps the stage's exact intrinsic aspect ratio */}
                <img
                    className="map-sizer"
                    src={imageMars}
                    alt=""
                    aria-hidden="true"
                    draggable="false"
                />

                <div className="map-canvas-layer">
                    <Suspense fallback={
                        <div className="globe-loading">
                            <span className="globe-loading-text">Initialising Map…</span>
                        </div>
                    }>
                        <GlobeMap
                            viewMode={viewMode}
                            coordString={coordString}
                            setCoordString={setCoordString}
                            activeOverlay={activeOverlay}
                            overlayOpacity={overlayOpacity}
                        />
                    </Suspense>
                </div>
            </div>
        </div>
    );
}

export default Map;