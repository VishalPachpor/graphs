'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGraphStore } from '@/stores/graphStore';
import { GraphNode } from '@/types/graph';
import { OrbitNode3D } from './OrbitNode3D';
import { ContextSheet } from './ContextSheet';

interface OrbitViewProps {
    onAIChat: (node: GraphNode) => void;
}

export function OrbitView({ onAIChat }: OrbitViewProps) {
    const { graph } = useGraphStore();
    const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

    // Calculate 3D orbital positions
    const orbitConfig = useMemo(() => {
        const mainNode = graph.nodes.find((n) => n.type === 'main');
        const otherNodes = graph.nodes.filter((n) => n.type !== 'main');

        // Sort by value
        const sorted = [...otherNodes].sort((a, b) => (b.value || 0) - (a.value || 0));

        // Distribute nodes across 3 orbit rings with different tilts
        const orbits = [
            { radius: 90, tilt: 75, speed: 8, count: 4 },   // Inner ring - fast, tilted
            { radius: 140, tilt: 70, speed: 5, count: 5 },  // Middle ring - medium
            { radius: 190, tilt: 65, speed: 3, count: 7 },  // Outer ring - slow
        ];

        const nodeConfigs: {
            node: GraphNode;
            radius: number;
            tilt: number;
            speed: number;
            startAngle: number;
            ring: number;
        }[] = [];

        let nodeIndex = 0;
        orbits.forEach((orbit, ringIndex) => {
            for (let i = 0; i < orbit.count && nodeIndex < sorted.length; i++) {
                const startAngle = (i / orbit.count) * 360 + ringIndex * 30; // Offset each ring
                nodeConfigs.push({
                    node: sorted[nodeIndex],
                    radius: orbit.radius,
                    tilt: orbit.tilt,
                    speed: orbit.speed * (0.8 + Math.random() * 0.4), // Slight variation
                    startAngle,
                    ring: ringIndex,
                });
                nodeIndex++;
            }
        });

        return { mainNode, nodeConfigs };
    }, [graph.nodes]);

    // Summary stats
    const stats = useMemo(() => {
        const nodes = graph.nodes.filter((n) => n.type !== 'main');
        const activePositions = nodes.filter((n) => (n.value || 0) > 1000).length;
        const needsAttention = nodes.filter((n) => (n.txCount || 0) > 10).length;
        return { watching: activePositions, attention: needsAttention };
    }, [graph.nodes]);

    return (
        <div className="h-full w-full bg-black relative overflow-hidden">
            {/* Space background with stars */}
            <div className="absolute inset-0">
                {[...Array(50)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute rounded-full bg-white"
                        style={{
                            width: Math.random() * 2 + 1,
                            height: Math.random() * 2 + 1,
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            opacity: Math.random() * 0.5 + 0.2,
                        }}
                    />
                ))}
            </div>

            {/* Nebula glow */}
            <div
                className="absolute inset-0"
                style={{
                    background: `
                        radial-gradient(ellipse at 50% 50%, rgba(99,102,241,0.1) 0%, transparent 50%),
                        radial-gradient(ellipse at 30% 40%, rgba(139,92,246,0.08) 0%, transparent 40%),
                        radial-gradient(ellipse at 70% 60%, rgba(6,182,212,0.06) 0%, transparent 35%)
                    `,
                }}
            />

            {/* Title */}
            <div className="absolute top-16 left-0 right-0 text-center z-20">
                <h1 className="text-gray-400 text-sm font-medium tracking-widest uppercase">Memory Orbit</h1>
            </div>

            {/* 3D Stage with perspective */}
            <div
                className="absolute inset-0 flex items-center justify-center"
                style={{
                    perspective: '800px',
                    perspectiveOrigin: '50% 50%',
                }}
            >
                {/* Orbit plane - tilted */}
                <div
                    className="relative"
                    style={{
                        transformStyle: 'preserve-3d',
                        transform: 'rotateX(20deg)',
                    }}
                >
                    {/* Orbit ring visuals */}
                    {[90, 140, 190].map((radius, i) => (
                        <motion.div
                            key={i}
                            className="absolute rounded-full"
                            style={{
                                width: radius * 2,
                                height: radius * 2 * 0.4, // Ellipse for perspective
                                left: -radius,
                                top: -radius * 0.4,
                                border: '1px solid rgba(99,102,241,0.15)',
                                boxShadow: `0 0 ${20 + i * 8}px rgba(99,102,241,${0.08 - i * 0.02})`,
                            }}
                            animate={{ rotateZ: 360 }}
                            transition={{
                                duration: 120 + i * 40,
                                repeat: Infinity,
                                ease: 'linear',
                            }}
                        />
                    ))}

                    {/* Center node (You) - 3D sphere */}
                    {orbitConfig.mainNode && (
                        <div className="relative z-50">
                            {/* Outer glow */}
                            <div
                                className="absolute inset-0 w-28 h-28 -translate-x-1/2 -translate-y-1/2 rounded-full blur-xl"
                                style={{
                                    left: '50%',
                                    top: '50%',
                                    background: 'rgba(99,102,241,0.5)'
                                }}
                            />

                            {/* 3D Sphere */}
                            <div
                                className="absolute w-24 h-24 rounded-full flex items-center justify-center"
                                style={{
                                    left: '50%',
                                    top: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    background: `
                                        radial-gradient(circle at 35% 35%, 
                                            rgba(139,92,246,0.8) 0%, 
                                            rgba(99,102,241,0.6) 40%, 
                                            rgba(67,56,202,0.8) 100%)
                                    `,
                                    boxShadow: `
                                        0 10px 40px rgba(99,102,241,0.5),
                                        0 0 60px rgba(139,92,246,0.3),
                                        inset 0 -8px 20px rgba(0,0,0,0.4),
                                        inset 0 8px 20px rgba(255,255,255,0.2)
                                    `,
                                    border: '2px solid rgba(255,255,255,0.2)',
                                }}
                            >
                                {/* Specular highlight */}
                                <div
                                    className="absolute top-3 left-4 w-8 h-4 rounded-full"
                                    style={{
                                        background: 'radial-gradient(ellipse, rgba(255,255,255,0.5) 0%, transparent 70%)',
                                    }}
                                />
                                <span className="text-white text-lg font-bold relative z-10">You</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* 3D Orbiting nodes */}
                {orbitConfig.nodeConfigs.map((config) => (
                    <OrbitNode3D
                        key={config.node.id}
                        node={config.node}
                        orbitRadius={config.radius}
                        orbitSpeed={config.speed}
                        startAngle={config.startAngle}
                        orbitTilt={config.tilt}
                        isActive={config.ring === 0}
                        onClick={() => setSelectedNode(config.node)}
                    />
                ))}
            </div>

            {/* Status Bar */}
            <div className="absolute bottom-32 left-4 right-4 z-20">
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="flex items-center justify-center gap-4 py-4 px-5 rounded-3xl"
                    style={{
                        background: 'linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
                        backdropFilter: 'blur(20px)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.08)',
                    }}
                >
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.3)' }}>
                            <span className="text-sm">👁</span>
                        </div>
                        <span className="text-white text-sm">Watching: <strong>{stats.watching}</strong></span>
                    </div>
                    {stats.attention > 0 && (
                        <>
                            <div className="w-px h-5 bg-gray-700/50" />
                            <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.3)' }}>
                                    <span className="text-sm">⚠️</span>
                                </div>
                                <span className="text-amber-400 text-sm"><strong>{stats.attention}</strong> attention</span>
                            </div>
                        </>
                    )}
                </motion.div>
            </div>

            {/* Hint */}
            <div className="absolute bottom-24 left-0 right-0 text-center z-20">
                <span className="text-gray-600 text-xs">Nodes orbit in 3D space • Tap to explore</span>
            </div>

            {/* Navigation */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="flex items-center gap-2 p-2 rounded-full"
                    style={{
                        background: 'linear-gradient(145deg, rgba(255,255,255,0.1), rgba(255,255,255,0.03))',
                        backdropFilter: 'blur(20px)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15)',
                        border: '1px solid rgba(255,255,255,0.08)',
                    }}
                >
                    {[
                        { icon: '◎', label: 'Orbit', active: true },
                        { icon: '🔍', label: 'Find', active: false },
                        { icon: '✨', label: 'AI', active: false },
                    ].map((item) => (
                        <button
                            key={item.label}
                            className="flex flex-col items-center justify-center w-16 h-12 rounded-full transition-all"
                            style={item.active ? {
                                background: 'linear-gradient(145deg, rgba(99,102,241,0.4), rgba(139,92,246,0.3))',
                                boxShadow: '0 4px 15px rgba(99,102,241,0.3)',
                            } : {}}
                        >
                            <span className="text-lg">{item.icon}</span>
                            <span className={`text-[9px] font-medium ${item.active ? 'text-white' : 'text-gray-500'}`}>
                                {item.label}
                            </span>
                        </button>
                    ))}
                </motion.div>
            </div>

            {/* Context Sheet */}
            <AnimatePresence>
                {selectedNode && (
                    <ContextSheet
                        node={selectedNode}
                        isOpen={!!selectedNode}
                        onClose={() => setSelectedNode(null)}
                        onAIChat={() => {
                            setSelectedNode(null);
                            onAIChat(selectedNode);
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
