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
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const SPHERE_RADIUS = 0.8;
const MARKER_SURFACE_OFFSET = 0.0025;
const GRID_SEGMENTS_X = 128;
const GRID_SEGMENTS_Y = 64;
const CAMERA_FOV = 45;
const CAMERA_Z = 2.45;
const TRANSITION_DURATION = 0.85; // seconds for 2D <-> 3D unfold

/* ------------------------------------------------------------------ */
/*  GLSL Shaders                                                       */
/* ------------------------------------------------------------------ */

const vertexShader = /* glsl */ `
varying vec2 vUv;

void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = /* glsl */ `
uniform sampler2D baseMap;
uniform sampler2D overlayMap;
uniform float overlayOpacity;
uniform bool hasOverlay;

varying vec2 vUv;

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

    gl_FragColor = baseColor;
}
`;

/* ------------------------------------------------------------------ */
/*  UV <-> Coordinate & Parametric Unfold Math                         */
/* ------------------------------------------------------------------ */

function sinc(x: number): number {
    return Math.abs(x) < 1e-5 ? 1.0 : Math.sin(x) / x;
}

function easeInOutCubic(x: number): number {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
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

    const lt = lambda * t;
    const pt = psi * t;

    const cosPt = Math.cos(pt);
    const sinPt = Math.sin(pt);

    const scaleX = THREE.MathUtils.lerp(planeWidth / (Math.PI * 2), SPHERE_RADIUS, t);
    const scaleY = THREE.MathUtils.lerp(planeHeight / Math.PI, SPHERE_RADIUS, t);

    const x = cosPt * lambda * sinc(lt) * scaleX;
    const y = psi * sinc(pt) * scaleY;
    const z = SPHERE_RADIUS * (cosPt * Math.cos(lt) - 1.0 + t);

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
 * Update all vertices of the grid geometry for a given morph factor t in [0, 1].
 */
function updateMorphedGeometry(
    geometry: THREE.BufferGeometry,
    t: number,
    planeWidth: number,
    planeHeight: number,
): void {
    const posAttr = geometry.attributes.position as THREE.BufferAttribute;
    const uvAttr = geometry.attributes.uv as THREE.BufferAttribute;
    const posArr = posAttr.array as Float32Array;
    const uvArr = uvAttr.array as Float32Array;
    const count = posAttr.count;

    const scaleX = THREE.MathUtils.lerp(planeWidth / (Math.PI * 2), SPHERE_RADIUS, t);
    const scaleY = THREE.MathUtils.lerp(planeHeight / Math.PI, SPHERE_RADIUS, t);

    for (let i = 0; i < count; i++) {
        const u = uvArr[i * 2];
        const v = uvArr[i * 2 + 1];

        const lambda = (u - 0.5) * Math.PI * 2;
        const psi = (v - 0.5) * Math.PI;

        const lt = lambda * t;
        const pt = psi * t;
        const cosPt = Math.cos(pt);

        posArr[i * 3]     = cosPt * lambda * sinc(lt) * scaleX;
        posArr[i * 3 + 1] = psi * sinc(pt) * scaleY;
        posArr[i * 3 + 2] = SPHERE_RADIUS * (cosPt * Math.cos(lt) - 1.0 + t);
    }

    posAttr.needsUpdate = true;
    geometry.computeBoundingSphere();
    geometry.computeBoundingBox();
}

/* ------------------------------------------------------------------ */
/*  Mars Scene (Morphing Mesh + Marker + Camera Controller)            */
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

            tmpPos.addScaledVector(tmpNormal, MARKER_SURFACE_OFFSET);
            group.position.copy(tmpPos);
            group.quaternion.setFromUnitVectors(zAxis, tmpNormal);

            // Slightly larger reticle on flat 2D map to match original 2D marker proportions
            const markerScale = THREE.MathUtils.lerp(1.45, 1.0, t);
            group.scale.setScalar(markerScale);
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
                endSphericalRef.current.copy(saved3DSphericalRef.current);
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

    /* ---------- Per-Frame Unfold & Camera Animation ---------- */

    useFrame((_, delta) => {
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

        // 1. Deform mesh between flat plane and sphere
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

        // 3. Interpolate camera along a spherical arc around the origin
        const r = THREE.MathUtils.lerp(
            startSphericalRef.current.radius,
            endSphericalRef.current.radius,
            ease,
        );
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
        camera.up.set(0, 1, 0);
        camera.lookAt(0, 0, 0);
        camera.updateProjectionMatrix();

        if (controlsRef.current) {
            controlsRef.current.target.set(0, 0, 0);
            controlsRef.current.update();
        }

        if (nextProgress >= 1) {
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
                    {/* Inner hexagonal ring (thick) */}
                    <mesh>
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

                    {/* Outer hexagonal ring (thin, rotated 30°) */}
                    <mesh rotation={[0, 0, Math.PI / 6]}>
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
/*  GlobeMap (Public Wrapper)                                          */
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
            onPointerDown={handleInteract}
        >
            <Canvas
                camera={{ position: [0, 0.2, CAMERA_Z], fov: CAMERA_FOV }}
                gl={{ antialias: true }}
                onPointerDown={handleInteract}
            >
                <color attach="background" args={['#090b0f']} />

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