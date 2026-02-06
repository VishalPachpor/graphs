'use client';
import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import { useGraphStore } from '@/stores/graphStore';
import { GraphNode } from '@/types/graph';

const DEFAULT_WALLET_ADDRESS = '0xB29b9fd58CdB2E3Bb068Bc8560D8c13B2454684d';
const DEFAULT_CHAIN_ID = 1;

// Dynamic import to avoid SSR issues with Three.js
const ForceGraph3DComponent = dynamic(() => import('./ForceGraph3D'), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center h-screen bg-[#0a0a0f]">
            <div className="text-white">Loading graph...</div>
        </div>
    ),
});

const ForceGraph2DComponent = dynamic(() => import('./ForceGraph2D'), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center h-screen bg-[#0a0a0f]">
            <div className="text-white">Loading graph...</div>
        </div>
    ),
});

export function GraphCanvas() {
    const { graph, initGraph, expandNode, selectNode } = useGraphStore();

    useEffect(() => {
        if (graph.nodes.length === 0) {
            initGraph(DEFAULT_WALLET_ADDRESS);
            expandNode(DEFAULT_WALLET_ADDRESS, DEFAULT_CHAIN_ID);
        }
    }, []);

    const handleNodeClick = (node: GraphNode) => {
        selectNode(node);
        expandNode(node.id, DEFAULT_CHAIN_ID);
        if (typeof window !== 'undefined' && window.webkit?.messageHandlers?.itemTapped) {
            const handler = window.webkit.messageHandlers.itemTapped;
            handler.postMessage({ nodeId: node.id });
        }
    };

    if (graph.nodes.length === 0) {
        return (
            <div className="flex items-center justify-center h-screen bg-[#0a0a0f]">
                <div className="text-gray-500 text-center">
                    <p className="text-xl mb-2">Loading graph...</p>
                </div>
            </div>
        );
    }

    return (
        <ForceGraph3DComponent graphData={graph} onNodeClick={handleNodeClick} />
    );
}
