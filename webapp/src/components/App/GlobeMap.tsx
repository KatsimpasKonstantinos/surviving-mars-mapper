import {
    Suspense,
    useRef,
    useState,
    useEffect,
    useMemo,
    useCallback,
    type ComponentRef,
} from 'react';
import { Canvas, useLoader, useFrame, useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import imageMars from '../../assets/mars.webp';
import type { coordinate, coordinateString } from '../../types';
import { coordinateTocoordinateString, coordinateStringTocoordinate } from '../../helper';
import { getMapImageSrc } from '../../helper/MapPreview';
import './GlobeMap.css';

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const SPHERE_RADIUS = 0.8;
const MARKER_SURFACE_OFFSET = 0.0025;
const GRID_SEGMENTS_X = 128;
const GRID_SEGMENTS_Y = 64;
const CAMERA_FOV = 45;
const CAMERA_Z = 2.45;
const TRANSITION_DURATION = 1.15; // Slightly longer to let the staged wave breathe

/* ------------------------------------------------------------------ */
/*  GLSL Shaders                                                      */
/* ------------------------------------------------------------------ */

const vertexShader = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
}
`;

const fragmentShader = /* glsl */ `
uniform sampler2D baseMap;
uniform sampler2D overlayMap;
uniform float overlayOpacity;
uniform bool hasOverlay;
uniform float uMorph;           // 0.0 = 2D flat, 1.0 = 3D globe
uniform float uTransitionPulse; // sin(progress * PI): 0 at rest, 1 at mid-transition
uniform float uScanlinePos;     // 0.0 -> 1.0 sweep progress

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
    vec4 baseColor = texture2D(baseMap, vUv);

    if (hasOverlay) {
        // Heatmap covers the ±70° latitude band -> UV v in [0.1, 0.9]
        float vMin = 0.1;
        float vMax = 0.9;

        if (vUv.y >= vMin && vUv.y <= vMax) {
            float remappedV = (vUv.y - vMin) / (vMax - vMin);
            vec2 overlayUv = vec2(vUv.x, remappedV);
            vec4 overlayColor = texture2D(overlayMap, overlayUv);
            float alpha = overlayColor.a * overlayOpacity;
            baseColor.rgb = mix(baseColor.rgb, overlayColor.rgb, alpha);
        }
    }

    // 1. Sci-Fi Holographic Grid & Scanline Wave during 2D <-> 3D transition
    if (uTransitionPulse > 0.001) {
        // 18 longitude x 9 latitude sectors (20-degree intervals)
        vec2 gridUv = fract(vUv * vec2(18.0, 9.0));
        vec2 gridDist = min(gridUv, 1.0 - gridUv);
        float gridLine = smoothstep(0.035, 0.008, min(gridDist.x, gridDist.y));

        // Sweeping radial wave from center UV (0.5, 0.5)
        float distFromCenter = length((vUv - 0.5) * vec2(2.0, 1.0));
        float scanWave = exp(-pow((distFromCenter - uScanlinePos * 1.4) * 7.0, 2.0));

        vec3 holoColor = vec3(1.0, 0.48, 0.2); // Martian telemetry amber
        float holoStrength = (gridLine * 0.35 + scanWave * 0.55) * uTransitionPulse;
        baseColor.rgb += holoColor * holoStrength;
    }

    // 2. 3D Martian Fresnel Atmosphere Rim Glow (fades in smoothly in 3D mode)
    if (uMorph > 0.01) {
        vec3 normal = normalize(vNormal);
        vec3 viewDir = normalize(vViewPosition);
        float fresnel = pow(1.0 - abs(dot(normal, viewDir)), 3.2);
        vec3 atmosphereColor = vec3(0.95, 0.38, 0.15);
        baseColor.rgb += atmosphereColor * fresnel * 0.42 * uMorph;
    }

    gl_FragColor = baseColor;
    #include <colorspace_fragment>
}
`;

/* ------------------------------------------------------------------ */
/*  UV <-> Coordinate & Staged Parametric Unfold Math                 */
/* ------------------------------------------------------------------ */

function sinc(x: number): number {
    return Math.abs(x) < 1e-5 ? 1.0 : Math.sin(x) / x;
}

function easeInOutCubic(x: number): number {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
    const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
}

/**
 * Convert texture UV (u, v) directly to Surviving Mars coordinates.
 * Matches the 2D map & shader 10%–90% active latitude band pixel-for-pixel.
 */
function uvToCoordinate(u: number, v: number): coordinate {
    const percentX = THREE.MathUtils.clamp(u, 0, 1);
    const percentY = THREE.MathUtils.clamp(1 - v, 0, 1);
    const activePercentY = THREE.MathUtils.clamp((percentY - 0.1) / 0.8, 0, 1);

    const lat = Math.round(activePercentY * 140 - 70);
    const long = Math.round(percentX * 360 - 180);

    return {
        lat: THREE.MathUtils.clamp(lat, -70, 70),
        long: THREE.MathUtils.clamp(long, -180, 180),
    };
}

/**
 * Convert Surviving Mars coordinates to exact texture UV (u, v).
 */
function coordinateToUv(coord: coordinate): { u: number; v: number } {
    const u = (coord.long + 180) / 360;
    const activePercentY = (coord.lat + 70) / 140;
    const percentY = 0.1 + activePercentY * 0.8;
    const v = 1 - percentY;
    return { u, v };
}

/**
 * Compute staged horizontal (tx) and vertical (ty) fold factors for a given UV.
 * Creates an origami-like wave where longitude wraps slightly ahead of latitude
 * and ripples outward from the center of the map.
 */
function getStagedMorphFactors(u: number, v: number, t: number): { tx: number; ty: number } {
    if (t <= 0) return { tx: 0, ty: 0 };
    if (t >= 1) return { tx: 1, ty: 1 };

    // Distance from center [0, ~0.7] creates a spatial ripple across the mesh
    const distX = Math.abs(u - 0.5);
    const distY = Math.abs(v - 0.5);

    // Longitude curls first, starting from the outer edges inward
    const tx = smoothstep(0.0, 0.82, t + (0.5 - distX) * 0.12 * Math.sin(t * Math.PI));
    // Latitude cinches the poles second, creating a cylinder -> sphere progression
    const ty = smoothstep(0.18, 1.0, t - distY * 0.1 * Math.sin(t * Math.PI));

    return { tx, ty };
}

/**
 * Evaluate the 3D position and outward unit normal for any UV (u, v)
 * at morph factor t in [0, 1] (0 = flat 2D plane, 1 = 3D sphere).
 */
function evaluateSurface(
    u: number,
    v: number,
    t: number,
    planeWidth: number,
    planeHeight: number,
    outPos: THREE.Vector3,
    outNormal?: THREE.Vector3,
): void {
    const lambda = (u - 0.5) * Math.PI * 2; // [-pi, pi]
    const psi = (v - 0.5) * Math.PI;        // [-pi/2, pi/2]

    const { tx, ty } = getStagedMorphFactors(u, v, t);

    const lt = lambda * tx;
    const pt = psi * ty;

    const cosPt = Math.cos(pt);
    const sinPt = Math.sin(pt);

    const scaleX = THREE.MathUtils.lerp(planeWidth / (Math.PI * 2), SPHERE_RADIUS, tx);
    const scaleY = THREE.MathUtils.lerp(planeHeight / Math.PI, SPHERE_RADIUS, ty);

    // Subtle organic wave ripple perpendicular to the surface mid-transition
    const wavePulse = Math.sin(t * Math.PI);
    const ripple = Math.sin(lambda * 2.0 + t * Math.PI * 2.0) * 0.035 * wavePulse;

    const x = cosPt * lambda * sinc(lt) * scaleX;
    const y = psi * sinc(pt) * scaleY;
    const z = SPHERE_RADIUS * (cosPt * Math.cos(lt) - 1.0 + tx) + ripple;

    outPos.set(x, y, z);

    if (outNormal) {
        outNormal.set(
            cosPt * Math.sin(lt),
            sinPt,
            cosPt * Math.cos(lt),
        ).normalize();
    }
}

/**
 * Update all vertices and normals of the grid geometry for a given morph factor t in [0, 1].
 */
function updateMorphedGeometry(
    geometry: THREE.BufferGeometry,
    t: number,
    planeWidth: number,
    planeHeight: number,
): void {
    const posAttr = geometry.attributes.position as THREE.BufferAttribute;
    const normAttr = geometry.attributes.normal as THREE.BufferAttribute;
    const uvAttr = geometry.attributes.uv as THREE.BufferAttribute;

    const posArr = posAttr.array as Float32Array;
    const normArr = normAttr.array as Float32Array;
    const uvArr = uvAttr.array as Float32Array;
    const count = posAttr.count;

    const wavePulse = Math.sin(t * Math.PI);

    for (let i = 0; i < count; i++) {
        const u = uvArr[i * 2];
        const v = uvArr[i * 2 + 1];

        const lambda = (u - 0.5) * Math.PI * 2;
        const psi = (v - 0.5) * Math.PI;

        const { tx, ty } = getStagedMorphFactors(u, v, t);

        const lt = lambda * tx;
        const pt = psi * ty;
        const cosPt = Math.cos(pt);
        const sinPt = Math.sin(pt);

        const scaleX = THREE.MathUtils.lerp(planeWidth / (Math.PI * 2), SPHERE_RADIUS, tx);
        const scaleY = THREE.MathUtils.lerp(planeHeight / Math.PI, SPHERE_RADIUS, ty);

        const ripple = Math.sin(lambda * 2.0 + t * Math.PI * 2.0) * 0.035 * wavePulse;

        posArr[i * 3] = cosPt * lambda * sinc(lt) * scaleX;
        posArr[i * 3 + 1] = psi * sinc(pt) * scaleY;
        posArr[i * 3 + 2] = SPHERE_RADIUS * (cosPt * Math.cos(lt) - 1.0 + tx) + ripple;

        // Analytical outward unit normal for smooth Fresnel lighting
        const nx = cosPt * Math.sin(lt);
        const ny = sinPt;
        const nz = cosPt * Math.cos(lt);
        const invLen = 1.0 / Math.hypot(nx, ny, nz);

        normArr[i * 3] = nx * invLen;
        normArr[i * 3 + 1] = ny * invLen;
        normArr[i * 3 + 2] = nz * invLen;
    }

    posAttr.needsUpdate = true;
    normAttr.needsUpdate = true;
    geometry.computeBoundingSphere();
    geometry.computeBoundingBox();
}

/* ------------------------------------------------------------------ */
/*  Mars Scene (Morphing Mesh + Marker + Camera Controller)           */
/* ------------------------------------------------------------------ */

interface MarsSceneProps {
    viewMode: '2d' | '3d';
    coordString: coordinateString | null;
    setCoordString: (coordStr: coordinateString | null) => void;
    activeOverlay: string;
    overlayOpacity: number;
    autoRotate: boolean;
    onInteract: () => void;
}

function MarsScene({
    viewMode,
    coordString,
    setCoordString,
    activeOverlay,
    overlayOpacity,
    autoRotate,
    onInteract,
}: MarsSceneProps) {
    const { camera, size } = useThree();
    const materialRef = useRef<THREE.ShaderMaterial>(null);
    const markerGroupRef = useRef<THREE.Group>(null);
    const innerRingRef = useRef<THREE.Mesh>(null);
    const outerRingRef = useRef<THREE.Mesh>(null);
    const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null);

    const [coordinate, setCoordinate] = useState<coordinate | null>(null);
    const [isTransitioning, setIsTransitioning] = useState(false);

    // Base grid geometry (128x64 subdivisions)
    const geometry = useMemo(
        () => new THREE.PlaneGeometry(1, 1, GRID_SEGMENTS_X, GRID_SEGMENTS_Y),
        [],
    );

    useEffect(() => {
        return () => geometry.dispose();
    }, [geometry]);

    // Calculate exact world-space dimensions that fill the camera frustum at z = 0
    const planeDims = useMemo(() => {
        const vFovRad = (CAMERA_FOV * Math.PI) / 180;
        const height = 2 * CAMERA_Z * Math.tan(vFovRad / 2);
        const aspect = size.height > 0 ? size.width / size.height : 2;
        const width = height * aspect;
        return { width, height };
    }, [size.width, size.height]);

    // Morph & camera transition state refs
    const morphRef = useRef<number>(viewMode === '3d' ? 1 : 0);
    const animStartMorphRef = useRef<number>(viewMode === '3d' ? 1 : 0);
    const targetMorphRef = useRef<number>(viewMode === '3d' ? 1 : 0);
    const animProgressRef = useRef<number>(1);

    const startSphericalRef = useRef(
        new THREE.Spherical(CAMERA_Z, Math.acos(0.2 / CAMERA_Z), 0),
    );
    const endSphericalRef = useRef(
        new THREE.Spherical(CAMERA_Z, Math.acos(0.2 / CAMERA_Z), 0),
    );
    const saved3DSphericalRef = useRef(
        new THREE.Spherical(CAMERA_Z, Math.acos(0.2 / CAMERA_Z), 0),
    );

    // Pointer tracking for 2D drag & 3D click-vs-orbit detection
    const isDragging2DRef = useRef(false);
    const pointerDownPosRef = useRef<{ x: number; y: number } | null>(null);

    // Scratch vectors to avoid allocations in useFrame
    const tmpPos = useMemo(() => new THREE.Vector3(), []);
    const tmpNormal = useMemo(() => new THREE.Vector3(), []);
    const zAxis = useMemo(() => new THREE.Vector3(0, 0, 1), []);

    /* ---------- Helper to place HexMarker on surface ---------- */

    const syncMarkerTransform = useCallback(
        (coord: coordinate | null, t: number, width: number, height: number) => {
            const group = markerGroupRef.current;
            if (!group || !coord) return;

            const { u, v } = coordinateToUv(coord);
            evaluateSurface(u, v, t, width, height, tmpPos, tmpNormal);

            // Hover the reticle slightly above the surface mid-transition ("orbital lock-on")
            const transitionLift = Math.sin(t * Math.PI) * 0.08;
            tmpPos.addScaledVector(tmpNormal, MARKER_SURFACE_OFFSET + transitionLift);
            group.position.copy(tmpPos);
            group.quaternion.setFromUnitVectors(zAxis, tmpNormal);

            // Slightly larger reticle on flat 2D map + subtle scale pop mid-flight
            const baseScale = THREE.MathUtils.lerp(1.45, 1.0, t);
            const popScale = 1.0 + Math.sin(t * Math.PI) * 0.35;
            group.scale.setScalar(baseScale * popScale);
        },
        [tmpPos, tmpNormal, zAxis],
    );

    /* ---------- Textures ---------- */

    const marsTexture = useLoader(THREE.TextureLoader, imageMars);
    useMemo(() => {
        marsTexture.colorSpace = THREE.SRGBColorSpace;
    }, [marsTexture]);

    const blankTexture = useMemo(() => {
        const t = new THREE.DataTexture(
            new Uint8Array([0, 0, 0, 0]),
            1,
            1,
            THREE.RGBAFormat,
        );
        t.needsUpdate = true;
        return t;
    }, []);

    const [overlayTexture, setOverlayTexture] = useState<THREE.Texture | null>(null);

    useEffect(() => {
        let aborted = false;

        if (activeOverlay === 'None') {
            setOverlayTexture(prev => {
                prev?.dispose();
                return null;
            });
            return;
        }

        const url = getMapImageSrc(activeOverlay);
        new THREE.TextureLoader().load(url, tex => {
            if (aborted) {
                tex.dispose();
                return;
            }
            tex.colorSpace = THREE.SRGBColorSpace;
            setOverlayTexture(prev => {
                prev?.dispose();
                return tex;
            });
        });

        return () => {
            aborted = true;
        };
    }, [activeOverlay]);

    /* ---------- Shader Uniforms ---------- */

    const uniforms = useMemo(
        () => ({
            baseMap: { value: marsTexture },
            overlayMap: { value: blankTexture },
            overlayOpacity: { value: overlayOpacity },
            hasOverlay: { value: false },
            uMorph: { value: viewMode === '3d' ? 1.0 : 0.0 },
            uTransitionPulse: { value: 0.0 },
            uScanlinePos: { value: 0.0 },
        }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [marsTexture, blankTexture],
    );

    useEffect(() => {
        const m = materialRef.current;
        if (!m) return;
        const has = overlayTexture !== null;
        m.uniforms.hasOverlay.value = has;
        m.uniforms.overlayMap.value = has ? overlayTexture : blankTexture;
        m.uniforms.overlayOpacity.value = overlayOpacity;
    }, [overlayTexture, overlayOpacity, blankTexture]);

    /* ---------- Coordinate Sync ---------- */

    useEffect(() => {
        const parsed = coordString ? coordinateStringTocoordinate(coordString) : null;
        setCoordinate(parsed);
        syncMarkerTransform(parsed, morphRef.current, planeDims.width, planeDims.height);
    }, [coordString, planeDims.width, planeDims.height, syncMarkerTransform]);

    /* ---------- Trigger 2D <-> 3D Transition ---------- */

    const prevViewModeRef = useRef<'2d' | '3d'>(viewMode);

    useEffect(() => {
        if (prevViewModeRef.current === viewMode) return;
        prevViewModeRef.current = viewMode;

        const nextTarget = viewMode === '3d' ? 1 : 0;
        animStartMorphRef.current = morphRef.current;
        targetMorphRef.current = nextTarget;
        animProgressRef.current = 0;
        setIsTransitioning(true);

        // Capture current camera spherical position
        const currentSpherical = new THREE.Spherical().setFromVector3(camera.position);
        // Normalize theta into [-pi, pi] for shortest-arc interpolation
        currentSpherical.theta = Math.atan2(
            Math.sin(currentSpherical.theta),
            Math.cos(currentSpherical.theta),
        );
        startSphericalRef.current.copy(currentSpherical);

        if (viewMode === '2d') {
            // Save current 3D view and animate camera to front-center for 2D plane
            saved3DSphericalRef.current.copy(currentSpherical);
            endSphericalRef.current.set(CAMERA_Z, Math.PI / 2, 0);
        } else {
            // Folding 2D -> 3D: if a coordinate is selected, orbit camera to face it
            if (coordinate) {
                const { u, v } = coordinateToUv(coordinate);
                const targetTheta = (u - 0.5) * Math.PI * 2;
                const targetPhi = THREE.MathUtils.clamp(
                    (1 - v) * Math.PI,
                    0.35,
                    Math.PI - 0.35,
                );
                endSphericalRef.current.set(CAMERA_Z, targetPhi, targetTheta);
            } else {
                // Add a gentle minimum spin if starting from 0 so the fold feels dynamic
                const saved = saved3DSphericalRef.current;
                if (Math.abs(saved.theta) < 0.05) {
                    saved.theta = 0.45;
                }
                endSphericalRef.current.copy(saved);
            }
        }
    }, [viewMode, camera, coordinate]);

    /* ---------- Re-fit Geometry on Canvas Resize ---------- */

    useEffect(() => {
        updateMorphedGeometry(
            geometry,
            morphRef.current,
            planeDims.width,
            planeDims.height,
        );
        syncMarkerTransform(
            coordinate,
            morphRef.current,
            planeDims.width,
            planeDims.height,
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [geometry, planeDims.width, planeDims.height]);

    /* ---------- Per-Frame Unfold, Shader & Reticle Animation ---------- */

    useFrame((state, delta) => {
        // Continuous counter-rotation for the hexagonal targeting reticle
        if (coordinate !== null) {
            const elapsed = state.clock.elapsedTime;
            if (innerRingRef.current) {
                innerRingRef.current.rotation.z = elapsed * 0.6;
            }
            if (outerRingRef.current) {
                outerRingRef.current.rotation.z = Math.PI / 6 - elapsed * 0.4;
            }
        }

        if (animProgressRef.current >= 1) return;

        const nextProgress = Math.min(
            1,
            animProgressRef.current + delta / TRANSITION_DURATION,
        );
        animProgressRef.current = nextProgress;

        const ease = easeInOutCubic(nextProgress);
        const currentMorph = THREE.MathUtils.lerp(
            animStartMorphRef.current,
            targetMorphRef.current,
            ease,
        );
        morphRef.current = currentMorph;

        // Bell-curve pulse (0 -> 1 -> 0) peaking halfway through the transition
        const transitionPulse = Math.sin(nextProgress * Math.PI);

        // Update shader uniforms for hologram grid, scanline, and 3D Fresnel glow
        if (materialRef.current) {
            materialRef.current.uniforms.uMorph.value = currentMorph;
            materialRef.current.uniforms.uTransitionPulse.value = transitionPulse;
            materialRef.current.uniforms.uScanlinePos.value = ease;
        }

        // 1. Deform mesh with staged cylinder-to-sphere wave
        updateMorphedGeometry(
            geometry,
            currentMorph,
            planeDims.width,
            planeDims.height,
        );

        // 2. Keep marker glued to its texel during the fold/unfold
        syncMarkerTransform(
            coordinate,
            currentMorph,
            planeDims.width,
            planeDims.height,
        );

        // 3. Interpolate camera along a spherical arc with a cinematic pullback dolly
        const baseRadius = THREE.MathUtils.lerp(
            startSphericalRef.current.radius,
            endSphericalRef.current.radius,
            ease,
        );
        // Pull camera back slightly mid-transition so the curling edges have room
        const dollyPullback = transitionPulse * 0.38;
        const r = baseRadius + dollyPullback;

        const phi = THREE.MathUtils.lerp(
            startSphericalRef.current.phi,
            endSphericalRef.current.phi,
            ease,
        );
        const theta = THREE.MathUtils.lerp(
            startSphericalRef.current.theta,
            endSphericalRef.current.theta,
            ease,
        );

        camera.position.setFromSphericalCoords(r, phi, theta);

        // Subtle banking roll ("Dutch angle") during transition, settling to (0, 1, 0)
        const bankDirection = targetMorphRef.current > animStartMorphRef.current ? 1 : -1;
        const bankAngle = transitionPulse * 0.075 * bankDirection;
        camera.up.set(Math.sin(bankAngle), Math.cos(bankAngle), 0).normalize();

        camera.lookAt(0, 0, 0);
        camera.updateProjectionMatrix();

        if (controlsRef.current) {
            controlsRef.current.target.set(0, 0, 0);
            controlsRef.current.update();
        }

        if (nextProgress >= 1) {
            camera.up.set(0, 1, 0);
            if (materialRef.current) {
                materialRef.current.uniforms.uTransitionPulse.value = 0.0;
            }
            setIsTransitioning(false);
        }
    });

    /* ---------- Pointer Handlers (2D Drag & 3D Click) ---------- */

    const applyUvSelection = useCallback(
        (u: number, v: number) => {
            const c = uvToCoordinate(u, v);
            setCoordinate(c);
            setCoordString(coordinateTocoordinateString(c));
            syncMarkerTransform(c, morphRef.current, planeDims.width, planeDims.height);
        },
        [setCoordString, syncMarkerTransform, planeDims.width, planeDims.height],
    );

    const handlePointerDown = useCallback(
        (e: ThreeEvent<PointerEvent>) => {
            onInteract();
            pointerDownPosRef.current = { x: e.clientX, y: e.clientY };

            if (viewMode === '2d' && !isTransitioning) {
                e.stopPropagation();
                isDragging2DRef.current = true;
                if (e.uv) {
                    applyUvSelection(e.uv.x, e.uv.y);
                }
            }
        },
        [viewMode, isTransitioning, onInteract, applyUvSelection],
    );

    const handlePointerMove = useCallback(
        (e: ThreeEvent<PointerEvent>) => {
            if (viewMode === '2d' && isDragging2DRef.current && !isTransitioning && e.uv) {
                e.stopPropagation();
                applyUvSelection(e.uv.x, e.uv.y);
            }
        },
        [viewMode, isTransitioning, applyUvSelection],
    );

    const handlePointerUp = useCallback(() => {
        isDragging2DRef.current = false;
    }, []);

    const handleClick = useCallback(
        (e: ThreeEvent<MouseEvent>) => {
            e.stopPropagation();
            if (viewMode !== '3d' || isTransitioning || !e.uv) return;

            // Ignore clicks that were actually 3D camera orbit drags
            if (pointerDownPosRef.current) {
                const dx = e.clientX - pointerDownPosRef.current.x;
                const dy = e.clientY - pointerDownPosRef.current.y;
                if (Math.hypot(dx, dy) > 6) return;
            }

            onInteract();
            applyUvSelection(e.uv.x, e.uv.y);
        },
        [viewMode, isTransitioning, onInteract, applyUvSelection],
    );

    useEffect(() => {
        const stopDrag = () => {
            isDragging2DRef.current = false;
        };
        window.addEventListener('pointerup', stopDrag);
        return () => window.removeEventListener('pointerup', stopDrag);
    }, []);

    return (
        <>
            <group>
                <mesh
                    geometry={geometry}
                    onClick={handleClick}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                >
                    <shaderMaterial
                        ref={materialRef}
                        vertexShader={vertexShader}
                        fragmentShader={fragmentShader}
                        uniforms={uniforms}
                        side={THREE.DoubleSide}
                    />
                </mesh>

                {/* Hexagonal Targeting Reticle (shared across 2D & 3D) */}
                <group ref={markerGroupRef} visible={coordinate !== null}>
                    {/* Inner hexagonal ring (thick, slowly rotating) */}
                    <mesh ref={innerRingRef}>
                        <ringGeometry args={[0.028, 0.044, 6]} />
                        <meshBasicMaterial
                            color="#ffffff"
                            side={THREE.DoubleSide}
                            transparent
                            opacity={0.9}
                            polygonOffset
                            polygonOffsetFactor={-2}
                        />
                    </mesh>

                    {/* Outer hexagonal ring (thin, counter-rotating) */}
                    <mesh ref={outerRingRef} rotation={[0, 0, Math.PI / 6]}>
                        <ringGeometry args={[0.054, 0.06, 6]} />
                        <meshBasicMaterial
                            color="#ffffff"
                            side={THREE.DoubleSide}
                            transparent
                            opacity={0.55}
                            polygonOffset
                            polygonOffsetFactor={-2}
                        />
                    </mesh>

                    {/* Centre dot */}
                    <mesh>
                        <circleGeometry args={[0.005, 12]} />
                        <meshBasicMaterial
                            color="#ffffff"
                            side={THREE.DoubleSide}
                            polygonOffset
                            polygonOffsetFactor={-2}
                        />
                    </mesh>
                </group>
            </group>

            <OrbitControls
                ref={controlsRef}
                enabled={viewMode === '3d' && !isTransitioning}
                enablePan={false}
                minDistance={1.2}
                maxDistance={4}
                autoRotate={viewMode === '3d' && !isTransitioning && autoRotate}
                autoRotateSpeed={0.3}
                enableDamping
                dampingFactor={0.05}
                onStart={onInteract}
            />
        </>
    );
}

/* ------------------------------------------------------------------ */
/*  GlobeMap (Public Wrapper)                                         */
/* ------------------------------------------------------------------ */

interface GlobeMapProps {
    viewMode: '2d' | '3d';
    coordString: coordinateString | null;
    setCoordString: (coordStr: coordinateString | null) => void;
    activeOverlay: string;
    overlayOpacity: number;
}

export default function GlobeMap({
    viewMode,
    coordString,
    setCoordString,
    activeOverlay,
    overlayOpacity,
}: GlobeMapProps) {
    const [autoRotate, setAutoRotate] = useState(true);

    const handleInteract = useCallback(() => {
        setAutoRotate(false);
    }, []);

    return (
        <div
            className={`GlobeMap mode-${viewMode}`}
            style={{ backgroundColor: 'var(--color-bg)' }}
            onPointerDown={handleInteract}
        >
            <Canvas
                camera={{ position: [0, 0.2, CAMERA_Z], fov: CAMERA_FOV }}
                gl={{ antialias: true, alpha: true }}
                onCreated={({ gl, scene }) => {
                    scene.background = null;
                    gl.setClearColor(0x000000, 0);
                }}
                onPointerDown={handleInteract}
            >
                <Suspense fallback={null}>
                    <MarsScene
                        viewMode={viewMode}
                        coordString={coordString}
                        setCoordString={setCoordString}
                        activeOverlay={activeOverlay}
                        overlayOpacity={overlayOpacity}
                        autoRotate={autoRotate}
                        onInteract={handleInteract}
                    />
                </Suspense>
            </Canvas>
        </div>
    );
}