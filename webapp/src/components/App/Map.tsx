import React, { useState, useEffect } from 'react';
import imageMars from '../../assets/mars.webp';
import './Map.css';
import type { coordinate, coordinateString } from '../../types';
import { coordinateTocoordinateString, coordinateStringTocoordinate } from '../../helper';
import { getMapImageSrc } from '../../helper/MapPreview';

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

function calculateCoordinate(x: number, y: number, width: number, height: number): coordinate {
    const topMargin = height * 0.1;
    const activeHeight = height * 0.8;
    
    let adjustedY = y - topMargin;
    adjustedY = Math.max(0, Math.min(activeHeight, adjustedY));

    let lat = Math.round((adjustedY / activeHeight) * 140 - 70);
    let long = Math.round((x / width) * 360 - 180);
    
    lat = Math.max(-70, Math.min(70, lat));
    long = Math.max(-180, Math.min(180, long));
    
    return { lat, long };
}

function coordinateToStyles(coord: coordinate) {
    const percentX = (coord.long + 180) / 360;
    
    const activePercentY = (coord.lat + 70) / 140;
    const percentY = 0.1 + (activePercentY * 0.8);
    
    return {
        top: `${percentY * 100}%`,
        left: `${percentX * 100}%`
    };
}

function Map({ coordString, setCoordString }: MapProps) {
    const [coordinate, setCoordinate] = useState<coordinate | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const [activeOverlay, setActiveOverlay] = useState<string>("None");
    const [overlayOpacity, setOverlayOpacity] = useState<number>(0.70);

    useEffect(() => {
        if (coordString) {
            const parsedCoordinate = coordinateStringTocoordinate(coordString);
            setCoordinate(parsedCoordinate);
        } else {
            setCoordinate(null);
        }
    }, [coordString]);

    const updateCoordinate = (event: React.PointerEvent<HTMLImageElement> | React.PointerEvent<HTMLDivElement>) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const newCoordinate = calculateCoordinate(x, y, rect.width, rect.height);
        setCoordinate(newCoordinate);
        setCoordString(coordinateTocoordinateString(newCoordinate));
    };

    const handlePointerDown = (event: React.PointerEvent<HTMLImageElement> | React.PointerEvent<HTMLDivElement>) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        setIsDragging(true);
        updateCoordinate(event);
    };

    const handlePointerMove = (event: React.PointerEvent<HTMLImageElement> | React.PointerEvent<HTMLDivElement>) => {
        if (isDragging) updateCoordinate(event);
    };

    const handlePointerUp = (event: React.PointerEvent<HTMLImageElement> | React.PointerEvent<HTMLDivElement>) => {
        event.currentTarget.releasePointerCapture(event.pointerId);
        setIsDragging(false);
    };

    return (
        <div className="Map-container">
            <div className="controls-bar">
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

            <div
                className="Map"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
            >
                <img
                    className="image base-image"
                    src={imageMars}
                    alt="Mars Base Map"
                    draggable="false"
                />

                {activeOverlay !== "None" && (
                    <img
                        className="image overlay-image"
                        src={getMapImageSrc(activeOverlay)}
                        alt={`${activeOverlay} Heatmap`}
                        draggable="false"
                        style={{ opacity: overlayOpacity }}
                    />
                )}

                {coordinate && (
                    <div
                        className="marker"
                        style={coordinateToStyles(coordinate)}
                        title={coordString || ''}
                    />
                )}
            </div>
        </div>
    );
}

export default Map;