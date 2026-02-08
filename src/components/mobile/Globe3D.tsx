'use client';

import { useRef, useMemo, useState, Suspense, useCallback, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Billboard, Text, Html, Environment, Float } from '@react-three/drei';
import * as THREE from 'three';
import { GraphNode } from '@/types/graph';
import { useGraphStore } from '@/stores/graphStore';
import { getNodeColor, getNodeContent } from '@/utils/mobileGraphUtils';

// --- SPATIAL CAMERA SYSTEM ---
// Production-grade mobile camera math for full orbit containment

const CAMERA_CONFIG = {
    fov: 38,              // Mobile premium spatial FOV
    padding: 1.35,        // UX breathing space
    tilt: 0.45,           // Cinematic perspective tilt (increased)
    yCompression: 0.9,    // Reduced compression for more depth
    entranceDuration: 2,  // Seconds for entrance animation
    lerpSpeed: 0.08,      // Smooth camera movement
};


function CameraController({ outerRadius }: { outerRadius: number }) {
    const { camera, size } = useThree();
    const mounted = useRef(false);
    const targetPos = useRef(new THREE.Vector3());

    // Calculate optimal camera distance on mount
    useEffect(() => {
        const fovRad = THREE.MathUtils.degToRad(CAMERA_CONFIG.fov);
        let distance = (outerRadius * CAMERA_CONFIG.padding) / Math.tan(fovRad / 2);

        // Portrait aspect correction (phones are tall)
        const aspect = size.width / size.height;
        if (aspect < 1) {
            distance *= 1.1;
        }

        const cameraY = distance * CAMERA_CONFIG.tilt;
        const cameraZ = distance;

        targetPos.current.set(0, cameraY, cameraZ);

        // Entrance animation: start far, settle into position
        if (!mounted.current) {
            camera.position.set(0, cameraY * 2, cameraZ * 1.5);
            mounted.current = true;
        }

        camera.lookAt(0, 0, 0);
    }, [camera, outerRadius, size]);

    // Smooth lerp to target position
    useFrame(() => {
        camera.position.lerp(targetPos.current, CAMERA_CONFIG.lerpSpeed);
        camera.lookAt(0, 0, 0);
    });

    return null;
}

// --- Configuration ---
const ORBIT_CONFIG = {
    // DRAMATIC tilts for 3D depth - X tilt creates front/back, Z tilt creates side angles
    core: { radius: 3.5, tilt: [0.5, 0.15, 0.1] as [number, number, number], speed: 0.12, direction: 1, color: '#8B5CF6' },
    active: { radius: 5.5, tilt: [0.35, 0.3, -0.15] as [number, number, number], speed: 0.06, direction: -1, color: '#6366F1' },
    ecosystem: { radius: 7.5, tilt: [0.6, -0.2, 0.1] as [number, number, number], speed: 0.03, direction: 1, color: '#3B82F6' },
};

// Organic noise parameters for breaking perfect symmetry
const ORGANIC_NOISE = {
    angleVariance: 0.15,   // ~8.5° deviation from perfect spacing
    radiusVariance: 0.3,   // ~12% deviation from perfect circle
    yVariance: 0.4,        // INCREASED: significant vertical scatter for depth
};

// --- Components ---

// Golden angle constant for natural distribution (Fibonacci spiral)
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5)); // ~137.5° in radians

function OrbitalRing({ radius, color, tier }: { radius: number, color: string, tier: 'core' | 'active' | 'ecosystem' }) {
    // Tier-based styling: inner rings brighter, outer rings faded
    const tierOpacity = tier === 'core' ? 0.25 : tier === 'active' ? 0.15 : 0.08;
    const tierGlowOpacity = tier === 'core' ? 0.1 : tier === 'active' ? 0.05 : 0.02;
    const tierThickness = tier === 'core' ? 0.04 : tier === 'active' ? 0.03 : 0.02;

    return (
        <group>
            {/* The Visual Ring Path */}
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[radius - tierThickness, radius + tierThickness, 128]} />
                <meshBasicMaterial color={color} transparent opacity={tierOpacity} side={THREE.DoubleSide} />
            </mesh>
            {/* Subtle glow ring */}
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[radius - 0.15, radius + 0.15, 64]} />
                <meshBasicMaterial color={color} transparent opacity={tierGlowOpacity} side={THREE.DoubleSide} />
            </mesh>
        </group>
    );
}

// Seeded pseudo-random for consistent noise per node
function seededRandom(seed: string): number {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        const char = seed.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }
    return (Math.abs(hash) % 1000) / 1000;
}

// Group that handles the rotation of nodes along the ring
function RingTier({
    config,
    nodes,
    tier,
    onNodeClick,
    maxValue,
    maxTxCount,
    hoveredNodeId,
    setHoveredNodeId
}: {
    config: typeof ORBIT_CONFIG.core,
    nodes: GraphNode[],
    tier: 'core' | 'active' | 'ecosystem',
    onNodeClick: (n: GraphNode) => void,
    maxValue: number,
    maxTxCount: number,
    hoveredNodeId: string | null,
    setHoveredNodeId: (id: string | null) => void
}) {
    const groupRef = useRef<THREE.Group>(null);

    useFrame((state, delta) => {
        if (groupRef.current) {
            // Rotate the container to orbit the nodes
            groupRef.current.rotation.y += delta * config.speed * config.direction;
        }
    });

    return (
        <group rotation={config.tilt}>
            {/* Static Visual Ring Track - now with tier-based styling */}
            <OrbitalRing radius={config.radius} color={config.color} tier={tier} />

            {/* Rotating Node Container */}
            <group ref={groupRef}>
                {nodes.map((node, i) => {
                    // GOLDEN ANGLE distribution for natural spacing
                    const goldenAngle = i * GOLDEN_ANGLE;
                    const seed = node.id;
                    const angleNoise = (seededRandom(seed) - 0.5) * ORGANIC_NOISE.angleVariance;
                    const radiusNoise = (seededRandom(seed + 'r') - 0.5) * ORGANIC_NOISE.radiusVariance * config.radius;
                    const yNoise = (seededRandom(seed + 'y') - 0.5) * ORGANIC_NOISE.yVariance;

                    const angle = goldenAngle + angleNoise;
                    const radius = config.radius + radiusNoise;
                    const x = Math.cos(angle) * radius;
                    const z = Math.sin(angle) * radius;
                    const y = yNoise;

                    return (
                        <GlassNode
                            key={node.id}
                            position={[x, y, z]}
                            node={node}
                            onClick={() => onNodeClick(node)}
                            tier={tier}
                            maxValue={maxValue}
                            maxTxCount={maxTxCount}
                            hoveredNodeId={hoveredNodeId}
                            setHoveredNodeId={setHoveredNodeId}
                        />
                    );
                })}
            </group>
        </group>
    )
}

function GlassNode({
    position,
    node,
    onClick,
    tier,
    maxValue,
    maxTxCount,
    hoveredNodeId,
    setHoveredNodeId
}: {
    position: [number, number, number],
    node: GraphNode,
    onClick: () => void,
    tier: 'core' | 'active' | 'ecosystem',
    maxValue: number,
    maxTxCount: number,
    hoveredNodeId: string | null,
    setHoveredNodeId: (id: string | null) => void
}) {
    const [hovered, setHovered] = useState(false);
    const content = useMemo(() => getNodeContent(node), [node]);
    const color = useMemo(() => getNodeColor(node.type), [node.type]);

    // Dynamic scale based on transaction value (hierarchy)
    const tierBaseScale = tier === 'core' ? 0.85 : tier === 'active' ? 0.65 : 0.5;
    const valueRatio = maxValue > 0 ? Math.min((node.value || 0) / maxValue, 1) : 0;
    const valueScale = 1 + valueRatio * 0.35; // Up to 35% larger for high-value nodes
    const scale = tierBaseScale * valueScale;

    // Importance-based glow intensity (also consider activity)
    const activityRatio = maxTxCount > 0 ? (node.txCount || 0) / maxTxCount : 0;
    const isImportant = node.type === 'highValue' || (node.value && node.value > maxValue * 0.5) || activityRatio > 0.5;
    const glowIntensity = isImportant ? 0.7 : 0.35;

    // Simple direct click handler for the DOM overlay
    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onClick();
    };

    // Ref for depth scaling
    const groupRef = useRef<THREE.Group>(null);
    const visualRef = useRef<THREE.Group>(null);

    // Parallax Depth Scaling
    useFrame(() => {
        if (groupRef.current && visualRef.current) {
            const worldPos = new THREE.Vector3();
            groupRef.current.getWorldPosition(worldPos);

            // Camera is at positive Z. Nodes with higher Z are closer.
            // Z range is roughly -8 to +8.
            // Scale factor: 0.8 (far) to 1.2 (near)
            const z = worldPos.z;
            const maxRadius = ORBIT_CONFIG.ecosystem.radius;
            const depthFactor = 0.25; // 25% size variation based on depth
            const parallaxScale = 1 + (z / maxRadius) * depthFactor;

            const hoverScale = hovered ? 1.15 : 1;
            const finalScale = scale * parallaxScale * hoverScale;

            // Apply scale to the visual group to avoid affecting hit areas if needed, 
            // but here we want everything to scale.
            visualRef.current.scale.setScalar(finalScale);
        }
    });

    // Focus Dimming Logic
    const isDimmed = hoveredNodeId && hoveredNodeId !== node.id;
    const opacity = isDimmed ? 0.3 : 1; // Dim to 30% if another node is hovered

    return (
        <group position={position} ref={groupRef}>
            <Float speed={2} rotationIntensity={0} floatIntensity={0.5}>
                <group ref={visualRef}>

                    {/* Glass Visuals - NO interaction, just visuals */}
                    <mesh>
                        <sphereGeometry args={[0.4, 32, 32]} />
                        <meshPhysicalMaterial
                            color={color}
                            transmission={0.97}
                            opacity={opacity}
                            roughness={0}
                            metalness={0.1}
                            ior={1.5}
                            thickness={1.5}
                            specularIntensity={1}
                            envMapIntensity={2}
                            clearcoat={1}
                        />
                    </mesh>

                    {/* Inner Core Glow - intensity based on importance */}
                    <mesh scale={0.35 + glowIntensity * 0.15}>
                        <sphereGeometry args={[0.4, 16, 16]} />
                        <meshBasicMaterial color={color} toneMapped={false} opacity={0.6 + glowIntensity * 0.4} transparent />
                    </mesh>

                    {/* Content Overlay - THE PRIMARY CLICK TARGET */}
                    <Html
                        position={[0, 0, 0]}
                        center
                        transform
                        sprite
                        distanceFactor={8}
                        style={{ pointerEvents: 'auto' }}
                        zIndexRange={[100, 0]}
                    >
                        <div
                            onClick={handleClick}
                            onMouseEnter={() => {
                                setHovered(true);
                                setHoveredNodeId(node.id);
                            }}
                            onMouseLeave={() => {
                                setHovered(false);
                                setHoveredNodeId(null);
                            }}
                            className="flex items-center justify-center rounded-full overflow-hidden transition-all duration-200 cursor-pointer select-none"
                            style={{
                                width: '50px',
                                height: '50px',
                                background: content.type === 'image' ? 'white' : 'rgba(0,0,0,0.3)',
                                fontSize: '28px',
                                transform: hovered ? 'scale(1.15)' : 'scale(1)',
                                boxShadow: hovered ? '0 0 20px rgba(139,92,246,0.6)' : 'none',
                            }}
                        >
                            {content.type === 'image' ? (
                                <img src={content.value} alt="" className="w-full h-full object-cover" />
                            ) : (
                                content.value
                            )}
                        </div>
                    </Html>

                    {/* Label */}
                    {(hovered || tier === 'core') && (
                        <Billboard position={[0, -0.65, 0]}>
                            <Text
                                fontSize={0.2}
                                color="white"
                                anchorX="center"
                                anchorY="top"
                                outlineWidth={0.02}
                                outlineColor="black"
                            >
                                {node.label.length > 12 ? node.label.slice(0, 10) + '..' : node.label}
                            </Text>
                        </Billboard>
                    )}
                </group>
            </Float>
        </group>
    );
}

function CenterAvatar() {
    return (
        <group>
            {/* Main Sphere */}
            <mesh>
                <sphereGeometry args={[0.8, 64, 64]} />
                <meshPhysicalMaterial
                    color="#8B5CF6"
                    transmission={0.6}
                    roughness={0.2}
                    metalness={0.4}
                    ior={1.5}
                    envMapIntensity={3}
                />
            </mesh>
            {/* Inner Light */}
            <pointLight intensity={2} color="#8B5CF6" distance={5} />

            <Html position={[0, 0, 0]} center transform sprite style={{ pointerEvents: 'none' }}>
                <div style={{ fontSize: '48px', filter: 'drop-shadow(0 0 20px rgba(139,92,246,0.8))' }}>
                    👤
                </div>
            </Html>
        </group>
    );
}

function SolarSystemScene({ nodes, onNodeClick }: { nodes: GraphNode[], onNodeClick: (n: GraphNode) => void }) {
    // Shared state for Focus Dimming
    const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

    // Calculate max value for hierarchy scaling
    const maxValue = useMemo(() => {
        return Math.max(...nodes.map(n => n.value || 0), 1);
    }, [nodes]);

    // Calculate max txCount for activity-based features
    const maxTxCount = useMemo(() => {
        return Math.max(...nodes.map(n => n.txCount || 0), 1);
    }, [nodes]);

    const groups = useMemo(() => {
        const otherNodes = nodes.filter(n => n.type !== 'main');

        // Split into tiers
        const core = otherNodes.filter(n => n.type === 'highValue' || (n.value && n.value > 1000));
        const active = otherNodes.filter(n => !core.includes(n) && (n.type === 'exchange' || n.txCount && n.txCount > 5));
        const ecosystem = otherNodes.filter(n => !core.includes(n) && !active.includes(n));

        // CLUSTER CONSTELLATIONS: Sort by type to group similar nodes
        const sortByType = (a: GraphNode, b: GraphNode) => (a.type || '').localeCompare(b.type || '');

        return {
            core: core.sort(sortByType),
            active: active.sort(sortByType),
            ecosystem: ecosystem.sort(sortByType)
        };
    }, [nodes]);

    // We no longer need a global system rotation if the rings are rotating individually.
    // However, a very slow global drift can add depth.
    const systemRef = useRef<THREE.Group>(null);
    useFrame((state, delta) => {
        if (systemRef.current) {
            systemRef.current.rotation.y += delta * 0.01;
        }
    });

    // Outer radius for camera framing
    const outerRadius = ORBIT_CONFIG.ecosystem.radius;

    return (
        <group ref={systemRef}>
            {/* SPATIAL CAMERA SYSTEM */}
            <CameraController outerRadius={outerRadius} />

            <Environment preset="city" />
            <ambientLight intensity={0.4} />
            <pointLight position={[10, 10, 10]} intensity={1} />
            <pointLight position={[-10, -5, -10]} intensity={0.5} color="#4F46E5" />

            <CenterAvatar />

            {/* Vertical Orbit Compression Wrapper - fits tall mobile viewports */}
            <group scale={[1, CAMERA_CONFIG.yCompression, 1]}>
                {/* Render Animated Tiers - pass maxValue and maxTxCount for hierarchy scaling */}
                <RingTier
                    config={ORBIT_CONFIG.core}
                    nodes={groups.core}
                    tier="core"
                    onNodeClick={onNodeClick}
                    maxValue={maxValue}
                    maxTxCount={maxTxCount}
                    hoveredNodeId={hoveredNodeId}
                    setHoveredNodeId={setHoveredNodeId}
                />
                <RingTier
                    config={ORBIT_CONFIG.active}
                    nodes={groups.active}
                    tier="active"
                    onNodeClick={onNodeClick}
                    maxValue={maxValue}
                    maxTxCount={maxTxCount}
                    hoveredNodeId={hoveredNodeId}
                    setHoveredNodeId={setHoveredNodeId}
                />
                <RingTier
                    config={ORBIT_CONFIG.ecosystem}
                    nodes={groups.ecosystem}
                    tier="ecosystem"
                    onNodeClick={onNodeClick}
                    maxValue={maxValue}
                    maxTxCount={maxTxCount}
                    hoveredNodeId={hoveredNodeId}
                    setHoveredNodeId={setHoveredNodeId}
                />
            </group>

            {/* Stars */}
            <Stars />

            <OrbitControls
                enablePan={false}
                minDistance={8}
                maxDistance={35}
                enableDamping
                dampingFactor={0.05}
                makeDefault
            />
        </group>
    );
}

function Stars() {
    const positions = useMemo(() => {
        const p = new Float32Array(500 * 3);
        for (let i = 0; i < 500; i++) {
            p[i * 3] = (Math.random() - 0.5) * 40;
            p[i * 3 + 1] = (Math.random() - 0.5) * 40;
            p[i * 3 + 2] = (Math.random() - 0.5) * 40;
        }
        return p;
    }, []);
    return (
        <points>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" count={500} array={positions} itemSize={3} args={[positions, 3]} />
            </bufferGeometry>
            <pointsMaterial size={0.05} color="#64748b" transparent opacity={0.4} sizeAttenuation />
        </points>
    )
}

interface Globe3DProps {
    onNodeClick: (n: GraphNode) => void;
    filteredNodes?: GraphNode[];
}

export function Globe3D({ onNodeClick, filteredNodes }: Globe3DProps) {
    const { graph } = useGraphStore();
    const nodes = filteredNodes || graph.nodes;

    return (
        <div className="w-full h-full bg-black">
            <Canvas
                camera={{ position: [0, 20, 30], fov: CAMERA_CONFIG.fov }} // Start far for entrance animation
                gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
            >
                <Suspense fallback={null}>
                    <SolarSystemScene nodes={nodes} onNodeClick={onNodeClick} />
                </Suspense>
            </Canvas>
        </div>
    );
}

