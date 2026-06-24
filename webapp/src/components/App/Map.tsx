import React, { useState, useEffect } from 'react'
import imageMars from '../../assets/mars.jpg'
import './Map.css'
import type { coordinate, coordinateString } from '../../types'
import { coordinateTocoordinateString, coordinateStringTocoordinate } from '../../helper';

interface MapProps {
    coordString: coordinateString | null;
    setCoordString: (coordStr: coordinateString | null) => void;
}

const MARGIN_NS = 0.05;
const MARGIN_WE = 0.02;

function calculateCoordinate(x: number, y: number, width: number, height: number): coordinate {
    const usableWidth = width * (1 - (MARGIN_WE * 2));
    const usableHeight = height * (1 - (MARGIN_NS * 2));
    const adjustedX = x - (width * MARGIN_WE);
    const adjustedY = y - (height * MARGIN_NS);
    let lat = Math.round((adjustedY / usableHeight) * 140 - 70);
    let long = Math.round((adjustedX / usableWidth) * 360 - 180);
    lat = Math.max(-70, Math.min(70, lat));
    long = Math.max(-180, Math.min(180, long));
    return { lat, long };
}

function coordinateToStyles(coord: coordinate) {
    const percentX = (coord.long + 180) / 360;
    const percentY = (coord.lat + 70) / 140;
    const left = (MARGIN_WE + (percentX * (1 - 2 * MARGIN_WE))) * 100;
    const top = (MARGIN_NS + (percentY * (1 - 2 * MARGIN_NS))) * 100;
    return { top: `${top}%`, left: `${left}%` };
}


function Map({ coordString, setCoordString }: MapProps) {
    const [coordinate, setCoordinate] = useState<coordinate | null>(null)
    const [isDragging, setIsDragging] = useState(false)

    useEffect(() => {
        if (coordString) {
            const parsedCoordinate = coordinateStringTocoordinate(coordString);
            setCoordinate(parsedCoordinate);
        } else {
            setCoordinate(null);
        }
    }, [coordString]);

    const updateCoordinate = (event: React.PointerEvent<HTMLImageElement>) => {
        const rect = event.currentTarget.getBoundingClientRect()
        const x = event.clientX - rect.left
        const y = event.clientY - rect.top
        const newCoordinate = calculateCoordinate(x, y, rect.width, rect.height)
        setCoordinate(newCoordinate)
        setCoordString(coordinateTocoordinateString(newCoordinate))
    }

    const handlePointerDown = (event: React.PointerEvent<HTMLImageElement>) => {
        event.currentTarget.setPointerCapture(event.pointerId)
        setIsDragging(true)
        updateCoordinate(event)
    }

    const handlePointerMove = (event: React.PointerEvent<HTMLImageElement>) => {
        if (isDragging) updateCoordinate(event)
    }

    const handlePointerUp = (event: React.PointerEvent<HTMLImageElement>) => {
        event.currentTarget.releasePointerCapture(event.pointerId)
        setIsDragging(false)
    }

    return (
        <div className="Map">
            <img
                className="image"
                src={imageMars}
                alt="Mars map"
                draggable="false"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
            />
            {coordinate && (
                <div
                    className="marker"
                    style={coordinateToStyles(coordinate)}
                    title={coordString || ''}
                />
            )}
        </div>
    )
}

export default Map