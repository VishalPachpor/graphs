'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { GraphNode } from '@/types/graph';

interface OrbitNode3DProps {
    node: GraphNode;
    orbitRadius: number;
    orbitSpeed: number; // degrees per second
    startAngle: number; // initial angle in degrees
    orbitTilt: number; // tilt of orbit plane in degrees
    isActive?: boolean;
    onClick: () => void;
}

// Protocol logo mapping
const protocolLogos: Record<string, string> = {
    'hyperliquid': '⚡',
    'uniswap': '🦄',
    'aave': '👻',
    'coinbase': '🔵',
    'binance': '🟡',
};

function getNodeLogo(node: GraphNode): string {
    const label = node.label.toLowerCase();
    for (const [key, emoji] of Object.entries(protocolLogos)) {
        if (label.includes(key)) return emoji;
    }
    switch (node.type) {
        case 'exchange': return '🏦';
        case 'highValue': return '💎';
        case 'receiver': return '📥';
        case 'sender': return '💸';
        default: return '👛';
    }
}

export function OrbitNode3D({
    node,
    orbitRadius,
    orbitSpeed,
    startAngle,
    orbitTilt,
    isActive = false,
    onClick
}: OrbitNode3DProps) {
    const [angle, setAngle] = useState(startAngle);
    const logo = getNodeLogo(node);

    // Animate the orbit
    useEffect(() => {
        const interval = setInterval(() => {
            setAngle((prev) => (prev + orbitSpeed * 0.05) % 360);
        }, 50);
        return () => clearInterval(interval);
    }, [orbitSpeed]);

    // Convert angle to 3D position
    const angleRad = (angle * Math.PI) / 180;
    const tiltRad = (orbitTilt * Math.PI) / 180;

    // 3D coordinates on tilted orbit plane
    const x = Math.cos(angleRad) * orbitRadius;
    const y = Math.sin(angleRad) * Math.cos(tiltRad) * orbitRadius * 0.4; // Compressed Y for tilt
    const z = Math.sin(angleRad) * Math.sin(tiltRad) * orbitRadius;

    // Calculate visual properties based on Z depth
    // z ranges from -orbitRadius to +orbitRadius
    const normalizedZ = (z + orbitRadius) / (2 * orbitRadius); // 0 = back, 1 = front
    const scale = 0.6 + normalizedZ * 0.5; // Scale from 0.6 (back) to 1.1 (front)
    const opacity = 0.4 + normalizedZ * 0.6; // Opacity from 0.4 (back) to 1.0 (front)
    const zIndex = Math.round(normalizedZ * 100);
    const blur = normalizedZ < 0.3 ? 2 : 0; // Blur when far back

    return (
        <motion.button
            onClick={onClick}
            className="absolute flex flex-col items-center gap-1"
            style={{
                left: '50%',
                top: '50%',
                transform: `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${scale})`,
                opacity,
                zIndex,
                filter: blur > 0 ? `blur(${blur}px)` : 'none',
            }}
            whileHover={{ scale: scale * 1.15 }}
            whileTap={{ scale: scale * 0.95 }}
        >
            {/* Glow effect for active/front nodes */}
            {(isActive || normalizedZ > 0.7) && (
                <div
                    className="absolute inset-0 rounded-full"
                    style={{
                        background: `radial-gradient(circle, rgba(99,102,241,${0.3 * normalizedZ}) 0%, transparent 70%)`,
                        filter: 'blur(12px)',
                        transform: 'scale(1.5)',
                    }}
                />
            )}

            {/* 3D Sphere-like node */}
            <div className="relative">
                <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-2xl relative overflow-hidden"
                    style={{
                        background: `
                            radial-gradient(circle at 30% 30%, 
                                rgba(255,255,255,0.25) 0%, 
                                rgba(255,255,255,0.05) 30%, 
                                rgba(0,0,0,0.3) 100%)
                        `,
                        boxShadow: `
                            0 ${4 * scale}px ${15 * scale}px rgba(0,0,0,0.4),
                            inset 0 -3px 8px rgba(0,0,0,0.3),
                            inset 0 3px 8px rgba(255,255,255,0.15)
                        `,
                        border: '1px solid rgba(255,255,255,0.1)',
                    }}
                >
                    {/* Specular highlight for 3D sphere look */}
                    <div
                        className="absolute top-1 left-2 w-4 h-2 rounded-full"
                        style={{
                            background: 'radial-gradient(ellipse, rgba(255,255,255,0.4) 0%, transparent 70%)',
                        }}
                    />
                    <span className="relative z-10">{logo}</span>
                </div>

                {/* Shadow beneath node */}
                <div
                    className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-10 h-3 rounded-full"
                    style={{
                        background: 'radial-gradient(ellipse, rgba(0,0,0,0.4) 0%, transparent 70%)',
                        transform: `translateX(-50%) scaleX(${0.8 + normalizedZ * 0.4})`,
                    }}
                />
            </div>

            {/* Label - only show when node is in front */}
            {normalizedZ > 0.5 && (
                <span
                    className="text-[10px] text-gray-400 max-w-16 truncate text-center mt-1"
                    style={{ opacity: normalizedZ }}
                >
                    {node.label.length > 10
                        ? `${node.label.slice(0, 4)}...${node.label.slice(-4)}`
                        : node.label
                    }
                </span>
            )}
        </motion.button>
    );
}
