'use client';

import { useState, useEffect } from 'react';
import { MobileLayout } from './MobileLayout';
import { MobileHome } from './MobileHome';
import { ConnectionsList } from './ConnectionsList';
import { ConnectionDetail } from './ConnectionDetail';
import { GraphNode } from '@/types/graph';
import { useGraphStore } from '@/stores/graphStore';

const DEFAULT_WALLET_ADDRESS = '0xB29b9fd58CdB2E3Bb068Bc8560D8c13B2454684d';
const DEFAULT_CHAIN_ID = 1;

type Screen = 'home' | 'connections' | 'detail';
type Tab = 'home' | 'graph' | 'search' | 'settings';

export function MobileApp() {
    const { graph, initGraph, expandNode } = useGraphStore();
    const [activeTab, setActiveTab] = useState<Tab>('home');
    const [screen, setScreen] = useState<Screen>('home');
    const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

    // Initialize graph on mount
    useEffect(() => {
        if (graph.nodes.length === 0) {
            initGraph(DEFAULT_WALLET_ADDRESS);
            expandNode(DEFAULT_WALLET_ADDRESS, DEFAULT_CHAIN_ID);
        }
    }, [graph.nodes.length, initGraph, expandNode]);

    // Handle tab changes
    const handleTabChange = (tab: Tab) => {
        setActiveTab(tab);
        if (tab === 'home') {
            setScreen('home');
            setSelectedNode(null);
        } else if (tab === 'search') {
            setScreen('connections');
            setSelectedNode(null);
        }
        // graph and settings tabs can be handled later
    };

    // Handle connection click
    const handleConnectionClick = (node: GraphNode) => {
        setSelectedNode(node);
        setScreen('detail');
    };

    // Handle back from detail
    const handleBack = () => {
        setSelectedNode(null);
        setScreen(activeTab === 'search' ? 'connections' : 'home');
    };

    // Handle see all connections
    const handleSeeAll = () => {
        setActiveTab('search');
        setScreen('connections');
    };

    // Loading state
    if (graph.nodes.length === 0) {
        return (
            <div className="flex items-center justify-center h-screen bg-[#0a0a0f]">
                <div className="text-center">
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-500">Loading wallet data...</p>
                </div>
            </div>
        );
    }

    // Detail screen (no tab bar)
    if (screen === 'detail' && selectedNode) {
        return <ConnectionDetail node={selectedNode} onBack={handleBack} />;
    }

    // Main layout with tabs
    return (
        <MobileLayout activeTab={activeTab} onTabChange={handleTabChange}>
            {screen === 'home' && (
                <MobileHome
                    onConnectionClick={handleConnectionClick}
                    onSeeAllClick={handleSeeAll}
                />
            )}
            {screen === 'connections' && (
                <ConnectionsList onConnectionClick={handleConnectionClick} />
            )}
        </MobileLayout>
    );
}
