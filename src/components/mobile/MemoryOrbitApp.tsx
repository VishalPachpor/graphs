'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { GraphNode } from '@/types/graph';
import { useGraphStore } from '@/stores/graphStore';
import { OrbitView3D } from './OrbitView3D';
import { ContextualChat } from './ContextualChat';


const DEFAULT_WALLET_ADDRESS = '0xB29b9fd58CdB2E3Bb068Bc8560D8c13B2454684d';
const DEFAULT_CHAIN_ID = 1;

type Screen = 'orbit' | 'chat';

export function MemoryOrbitApp() {
    const { graph, initGraph, expandNode } = useGraphStore();
    const [screen, setScreen] = useState<Screen>('orbit');
    const [chatNode, setChatNode] = useState<GraphNode | null>(null);

    // Initialize graph on mount
    useEffect(() => {
        if (graph.nodes.length === 0) {
            initGraph(DEFAULT_WALLET_ADDRESS);
            expandNode(DEFAULT_WALLET_ADDRESS, DEFAULT_CHAIN_ID);
        }
    }, [graph.nodes.length, initGraph, expandNode]);

    // Handle AI chat trigger
    const handleAIChat = (node: GraphNode) => {
        setChatNode(node);
        setScreen('chat');
    };

    // Handle back from chat
    const handleBack = () => {
        setScreen('orbit');
        setChatNode(null);
    };

    // Loading state
    if (graph.nodes.length === 0) {
        return (
            <div className="flex items-center justify-center h-screen bg-black">
                <div className="text-center">
                    <div className="w-12 h-12 rounded-full border-2 border-purple-500 border-t-transparent animate-spin mx-auto mb-4" />
                    <p className="text-gray-500">Loading memory orbit...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen w-screen bg-black overflow-hidden">
            <AnimatePresence mode="wait">
                {screen === 'orbit' && (
                    <OrbitView3D key="orbit" onAIChat={handleAIChat} />
                )}
                {screen === 'chat' && chatNode && (
                    <ContextualChat key="chat" node={chatNode} onBack={handleBack} />
                )}
            </AnimatePresence>
        </div>
    );
}
