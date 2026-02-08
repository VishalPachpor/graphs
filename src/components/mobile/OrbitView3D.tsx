'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal } from 'lucide-react';
import { GraphNode } from '@/types/graph';
import { useGraphStore, useFilteredGraph } from '@/stores/graphStore';
import { Globe3D } from './Globe3D';
import { ContextSheet } from './ContextSheet';
import { MobileSearchSheet } from './MobileSearchSheet';
import { MobileFilterSheet } from './MobileFilterSheet';

interface OrbitView3DProps {
    onAIChat: (node: GraphNode) => void;
}

type ActiveSheet = 'search' | 'filter' | null;

export function OrbitView3D({ onAIChat }: OrbitView3DProps) {
    const { graph } = useGraphStore();
    const filteredGraph = useFilteredGraph();
    const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
    const [activeSheet, setActiveSheet] = useState<ActiveSheet>(null);

    // Summary stats (from filtered graph)
    const stats = {
        watching: filteredGraph.nodes.filter((n) => n.type !== 'main' && (n.value || 0) > 1000).length,
        attention: filteredGraph.nodes.filter((n) => (n.txCount || 0) > 10).length,
    };

    const filterCount = useGraphStore((s) => {
        let count = 0;
        if (s.graphMode === 'memory') count++;
        if (s.timeRange !== 'all') count++;
        if (s.filterCategories.length < 4) count += (4 - s.filterCategories.length);
        if (s.searchQuery) count++;
        return count;
    });

    return (
        <div className="h-full w-full bg-black relative overflow-hidden">
            {/* Background gradient */}
            <div
                className="absolute inset-0"
                style={{
                    background: `
                        radial-gradient(ellipse at 50% 50%, rgba(99,102,241,0.08) 0%, transparent 50%),
                        radial-gradient(ellipse at 30% 40%, rgba(139,92,246,0.05) 0%, transparent 40%)
                    `,
                }}
            />

            {/* Title */}
            <div className="absolute top-12 left-0 right-0 text-center z-20 pointer-events-none">
                <h1 className="text-gray-400 text-sm font-medium tracking-widest uppercase">Memory Orbit</h1>
                <p className="text-gray-600 text-xs mt-1">Drag to rotate • Pinch to zoom</p>
            </div>

            {/* Filter Button (Status Bar Area) */}
            <button
                onClick={() => setActiveSheet('filter')}
                className="absolute top-12 right-4 z-30 flex items-center gap-2 px-3 py-2 rounded-full transition-all"
                style={{
                    background: filterCount > 0
                        ? 'linear-gradient(145deg, rgba(99,102,241,0.3), rgba(139,92,246,0.2))'
                        : 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                }}
            >
                <SlidersHorizontal size={16} className={filterCount > 0 ? 'text-indigo-400' : 'text-gray-500'} />
                {filterCount > 0 && (
                    <span className="text-xs font-medium text-indigo-400">{filterCount}</span>
                )}
            </button>

            {/* 3D Globe Canvas */}
            <div className="absolute inset-0 z-10">
                <Globe3D
                    onNodeClick={(node) => setSelectedNode(node)}
                    filteredNodes={filteredGraph.nodes}
                />
            </div>

            {/* Status Bar */}
            <div className="absolute bottom-28 left-4 right-4 z-20">
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
                        { icon: '🌐', label: 'Globe', action: () => { }, active: !activeSheet },
                        { icon: '🔍', label: 'Find', action: () => setActiveSheet('search'), active: activeSheet === 'search' },
                        { icon: '✨', label: 'AI', action: () => { }, active: false },
                    ].map((item) => (
                        <button
                            key={item.label}
                            onClick={item.action}
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

            {/* Search Sheet */}
            <MobileSearchSheet
                isOpen={activeSheet === 'search'}
                onClose={() => setActiveSheet(null)}
            />

            {/* Filter Sheet */}
            <MobileFilterSheet
                isOpen={activeSheet === 'filter'}
                onClose={() => setActiveSheet(null)}
            />
        </div>
    );
}

