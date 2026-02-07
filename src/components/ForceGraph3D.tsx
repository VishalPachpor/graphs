'use client';

import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { GraphData, GraphNode } from '@/types/graph';
import * as THREE from 'three';

const ForceGraph = dynamic(() => import('react-force-graph-3d'), { ssr: false });

// Known protocol/exchange logos (CDN URLs)
const PROTOCOL_LOGOS: Record<string, string> = {
    '0x28c6c06298d514db089934071355e5743bf21d60': 'https://cryptologos.cc/logos/binance-coin-bnb-logo.png',
    '0x21a31ee1afc51d94c2efccaa2092ad1028285549': 'https://cryptologos.cc/logos/binance-coin-bnb-logo.png',
    '0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be': 'https://cryptologos.cc/logos/binance-coin-bnb-logo.png',
    '0x7a250d5630b4cf539739df2c5dacb4c659f2488d': 'https://cryptologos.cc/logos/uniswap-uni-logo.png',
};

const CATEGORY_COLORS: Record<string, string> = {
    defi: '#22d3ee',
    tradfi: '#fbbf24',
    cex: '#6366f1',
    p2p: '#94a3b8',
    main: '#60a5fa',
};

interface Props {
    graphData: GraphData;
    onNodeClick: (node: GraphNode) => void;
}

export default function ForceGraph3D({ graphData, onNodeClick }: Props) {
    const fgRef = useRef<any>(null);
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
    const textureLoader = useMemo(() => new THREE.TextureLoader(), []);
    const textureCache = useRef<Record<string, THREE.Texture>>({});
    const bloomInitialized = useRef(false);

    // Resize handler
    useEffect(() => {
        const handleResize = () => {
            setDimensions({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // ⚙️ EXACT 0xPPL RADIAL LAYOUT & VISUALS
    useEffect(() => {
        if (!fgRef.current) return;

        const fg = fgRef.current;

        // 1. RADIAL STAR LAYOUT FORCE — more spacing, less clutter
        try {
            fg.d3Force('charge').strength(-600); // Stronger repulsion
            fg.d3Force('link').distance(220);    // Longer links
            fg.d3Force('center').strength(0.08); // Slight pull to center

            // Custom radial force
            fg.d3Force('radial', () => {
                const nodes = graphData.nodes;
                const centerNode = nodes.find((n: any) => n.id.toLowerCase() === graphData.nodes[0]?.id.toLowerCase());

                if (!centerNode) return;

                nodes.forEach((node: any, i: number) => {
                    if (node.id === centerNode.id) {
                        node.fx = 0;
                        node.fy = 0;
                        node.fz = 0;
                        return;
                    }

                    // For direct neighbors of center, enforce radial distribution if needed
                    // But standard force layout with strong charge often does this naturally.
                    // Let's add a gentle constraint to keep them on a plane
                    node.vz *= 0.9; // Flatten z-axis movement slightly
                });
            });

        } catch (e) {
            console.warn('Force setup error:', e);
        }

        // 2. FOG DEPTH EFFECT (Deep Space)
        try {
            const scene = fg.scene();
            if (scene) {
                scene.fog = new THREE.FogExp2(0x000000, 0.001); // Reduced fog density for better visibility at distance
                scene.background = new THREE.Color('#020617'); // Dark navy/black
            }
        } catch (e) {
            console.warn('Fog setup error:', e);
        }

        // 3. BLOOM POST-PROCESSING & ANIMATION LOOP
        if (!bloomInitialized.current) {
            bloomInitialized.current = true;
            Promise.all([
                import('three/examples/jsm/postprocessing/EffectComposer.js'),
                import('three/examples/jsm/postprocessing/RenderPass.js'),
                import('three/examples/jsm/postprocessing/UnrealBloomPass.js'),
            ]).then(([{ EffectComposer }, { RenderPass }, { UnrealBloomPass }]) => {
                try {
                    const renderer = fg.renderer();
                    const scene = fg.scene();
                    const camera = fg.camera();

                    if (renderer && scene && camera) {
                        const composer = new EffectComposer(renderer);
                        composer.addPass(new RenderPass(scene, camera));

                        const bloomPass = new UnrealBloomPass(
                            new THREE.Vector2(window.innerWidth, window.innerHeight),
                            0.4,   // strength (Reduced from 0.7 for cleaner look)
                            0.4,   // radius
                            0.85   // threshold
                        );
                        composer.addPass(bloomPass);

                        const originalAnimate = fg._animationCycle;
                        fg._animationCycle = () => {
                            originalAnimate?.call(fg);
                            // Pulse animation removed per user request for less clutter.
                            composer.render();
                        };
                    }
                } catch (e) { console.warn('Bloom error:', e); }
            });
        }

        // 4. CAMERA LOCK (Focus on center initially)
        setTimeout(() => {
            fg.cameraPosition({ x: 0, y: 0, z: 450 }, { x: 0, y: 0, z: 0 }, 1000);
        }, 1000);

    }, [graphData]);

    const handleClick = useCallback((node: any) => {
        if (fgRef.current) {
            const distance = 500; // Increased to 500 to keep context visible and prevent "missing nodes" illusion
            const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);
            fgRef.current.cameraPosition(
                { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
                node,
                1500
            );
        }
        onNodeClick(node);
    }, [onNodeClick]);

    // 🎨 CUSTOM NODE RENDERING — label from displayName, border by category
    const nodeThreeObject = useCallback((node: any) => {
        const group = new THREE.Group();
        const isMain = node.type === 'main';
        const size = isMain ? 14 : (5 + Math.log(node.value || 1) * 0.35);
        const category = node.category || 'p2p';
        const borderColor = isMain ? CATEGORY_COLORS.main : (CATEGORY_COLORS[category] || '#475569');

        const protocolLogo = PROTOCOL_LOGOS[node.id.toLowerCase()];
        const imgUrl = isMain ? `https://effigy.im/a/${node.id}.png` : protocolLogo;
        const textLabel = (node.displayName || node.label || node.id).slice(0, 6);

        const canvas = document.createElement('canvas');
        canvas.width = 128; canvas.height = 128;
        const ctx = canvas.getContext('2d')!;

        const drawNode = (image?: HTMLImageElement) => {
            ctx.clearRect(0, 0, 128, 128);

            ctx.beginPath();
            ctx.arc(64, 64, 60, 0, 2 * Math.PI);
            ctx.fillStyle = isMain ? '#1e3a5f' : '#1e293b';
            ctx.fill();

            if (image) {
                ctx.save();
                ctx.beginPath();
                ctx.arc(64, 64, 60, 0, 2 * Math.PI);
                ctx.clip();
                ctx.drawImage(image, 4, 4, 120, 120);
                ctx.restore();
            }

            ctx.beginPath();
            ctx.arc(64, 64, 60, 0, 2 * Math.PI);
            ctx.strokeStyle = borderColor;
            ctx.lineWidth = 4;
            ctx.stroke();

            if (!image) {
                ctx.fillStyle = '#e2e8f0';
                ctx.font = 'bold 20px Inter, system-ui, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(textLabel.toUpperCase(), 64, 64);
            }
        };

        // Initial draw (no image yet)
        drawNode();

        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;

        const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(size * 2, size * 2, 1);
        group.add(sprite);

        // Load Image dynamically and update texture
        if (imgUrl) {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.src = imgUrl;
            img.onload = () => {
                drawNode(img);
                texture.needsUpdate = true;
            };
        }

        return group;
    }, [textureLoader]);

    // Helper removed (integrated into nodeThreeObject for sorting/clipping)

    // ⚡️ CUSTOM BEAM EDGES (Optimized Cylinder) — opacity by recency
    const linkThreeObject = useCallback((link: any) => {
        let color = '#6366f1';
        if (link.direction === 'inbound') color = '#22c55e';
        if (link.direction === 'outbound') color = '#ef4444';
        const opacity = 0.15 + 0.25 * recencyFactor(link.lastActive);

        const material = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity,
        });

        const val = link?.value || 1;
        const radius = Math.max(0.08, Math.min(0.9, Math.log10(val + 1) * 0.22));

        const geometry = new THREE.CylinderGeometry(radius, radius, 1, 6, 1, true);
        geometry.rotateX(Math.PI / 2);

        return new THREE.Mesh(geometry, material);
    }, []);

    const linkPositionUpdate = useCallback((obj: any, { start, end }: any, link: any) => {
        const startV = new THREE.Vector3(start.x, start.y, start.z);
        const endV = new THREE.Vector3(end.x, end.y, end.z);
        const dist = startV.distanceTo(endV);

        // Position at midpoint
        obj.position.copy(startV.clone().add(endV).multiplyScalar(0.5));

        // Look at end point
        obj.lookAt(endV);

        // Scale Z to match distance
        obj.scale.set(1, 1, dist);

        return true;
    }, []);



    // Format value for tooltip
    const formatValue = (value: number | undefined): string => {
        if (!value || value === 0) return '';
        if (value > 1e12) value = value / 1e18;
        if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
        if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
        if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
        return `$${value.toFixed(2)}`;
    };

    /** Recency: 1 = last 7d, lower = older. Used for edge opacity. */
    function recencyFactor(lastActive: string | undefined): number {
        if (!lastActive) return 0.5;
        const then = new Date(lastActive).getTime();
        const days = (Date.now() - then) / (24 * 60 * 60 * 1000);
        if (days <= 7) return 1;
        if (days <= 30) return 0.85;
        if (days <= 90) return 0.6;
        return 0.35;
    }

    const linkLabel = useCallback((link: any) => {
        const val = formatValue(link?.value);
        const last = link?.lastActive ? new Date(link.lastActive).toLocaleDateString() : '—';
        const type = link?.relationshipType || '—';
        const dir = link?.direction === 'inbound' ? '→ You' : link?.direction === 'outbound' ? 'You →' : '↔';
        const txCount = link?.txCount ?? 0;
        return `
            <div style="background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(12px); border: 1px solid rgba(99, 102, 241, 0.4); padding: 12px 14px; border-radius: 10px; color: white; font-family: Inter, system-ui, sans-serif; min-width: 160px;">
                <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">${type} · ${txCount} tx</div>
                <div style="font-size: 14px; font-weight: 600; margin: 6px 0;">${val} ${dir}</div>
                <div style="font-size: 11px; color: #64748b;">Last active: ${last}</div>
            </div>
        `;
    }, []);

    const nodeLabel = useCallback((node: any) => {
        const formattedValue = formatValue(node.value);
        const name = node.displayName || node.label || `${node.id.slice(0, 6)}…${node.id.slice(-4)}`;
        const cat = (node.category || 'p2p').toUpperCase();
        const catColor = CATEGORY_COLORS[node.category] || CATEGORY_COLORS.p2p;
        return `
            <div style="background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(12px); border: 1px solid ${catColor}40; padding: 14px 16px; border-radius: 10px; color: white; font-family: Inter, system-ui, sans-serif; min-width: 140px;">
                <div style="font-weight: 700; font-size: 15px; margin-bottom: 6px;">${name}</div>
                <div style="font-size: 11px; color: ${catColor}; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">${cat}</div>
                <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">${node.type || '—'}</div>
                ${formattedValue ? `<div style="font-size: 13px; color: #4ade80; font-weight: 600; margin-top: 8px;">${formattedValue} vol</div>` : ''}
            </div>
        `;
    }, []);

    return (
        <ForceGraph
            ref={fgRef}
            graphData={graphData}
            width={dimensions.width}
            height={dimensions.height}

            // Nodes
            nodeThreeObject={nodeThreeObject}
            nodeThreeObjectExtend={false}
            nodeLabel={nodeLabel}

            // Link BEAMS
            linkThreeObject={linkThreeObject}
            linkPositionUpdate={linkPositionUpdate}
            linkLabel={linkLabel}
            linkWidth={0}

            // Particles (Still good to have inside beams?)
            linkDirectionalParticles={1}
            linkDirectionalParticleSpeed={0.005}
            linkDirectionalParticleWidth={1.2}
            linkDirectionalParticleColor={() => '#ffffff'} // White dots inside colored beams

            onNodeClick={handleClick}
            backgroundColor="#020617"
            showNavInfo={false}

            d3AlphaDecay={0.04} // Settle faster
            d3VelocityDecay={0.3}
        />
    );
}
