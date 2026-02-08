'use client';

import { useGraphStore } from '@/stores/graphStore';
import { GraphNode } from '@/types/graph';
import { ArrowUpRight, ArrowDownLeft, ArrowLeftRight, ChevronRight } from 'lucide-react';

// Format volume with proper abbreviations
function formatVolume(value: number): string {
    if (!value || value === 0) return '$0';
    if (value > 1e12) value = value / 1e18;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
}

// Get node type emoji
function getNodeEmoji(type: string): string {
    switch (type) {
        case 'main': return '🔮';
        case 'exchange': return '🏦';
        case 'highValue': return '💎';
        case 'receiver': return '📥';
        case 'sender': return '💸';
        default: return '👛';
    }
}

interface MobileHomeProps {
    onConnectionClick: (node: GraphNode) => void;
    onSeeAllClick: () => void;
}

export function MobileHome({ onConnectionClick, onSeeAllClick }: MobileHomeProps) {
    const { graph } = useGraphStore();

    // Find the main wallet node
    const mainNode = graph.nodes.find((n) => n.type === 'main');

    // Get connected nodes (excluding main)
    const connections = graph.nodes
        .filter((n) => n.type !== 'main')
        .sort((a, b) => (b.value || 0) - (a.value || 0));

    // Calculate totals
    const totalValue = connections.reduce((sum, n) => sum + (n.value || 0), 0);
    const totalTxns = connections.reduce((sum, n) => sum + (n.txCount || 0), 0);
    const activeProtocols = connections.filter((n) => n.type === 'exchange' || n.type === 'highValue').length;

    // Get direction icon for a connection based on link data
    const getDirectionIcon = (node: GraphNode) => {
        const link = graph.links.find((l) => l.source === node.id || l.target === node.id);
        if (!link) return <ArrowLeftRight size={14} className="text-purple-400" />;
        switch (link.direction) {
            case 'inbound':
                return <ArrowDownLeft size={14} className="text-green-400" />;
            case 'outbound':
                return <ArrowUpRight size={14} className="text-red-400" />;
            default:
                return <ArrowLeftRight size={14} className="text-purple-400" />;
        }
    };

    return (
        <div className="px-4 pt-6 space-y-6">
            {/* Header */}
            <div className="text-center space-y-1">
                <p className="text-gray-400 text-sm">Your Wallet</p>
                <p className="text-gray-300 text-xs font-mono">
                    {mainNode?.id.slice(0, 6)}...{mainNode?.id.slice(-4)}
                </p>
            </div>

            {/* Hero Card */}
            <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-2xl p-6 text-center">
                <p className="text-4xl font-bold text-white mb-1">
                    {formatVolume(totalValue)}
                </p>
                <p className="text-gray-400 text-sm">Total Volume</p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-3 text-center">
                    <p className="text-xl font-bold text-white">{connections.length}</p>
                    <p className="text-gray-500 text-xs">Connections</p>
                </div>
                <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-3 text-center">
                    <p className="text-xl font-bold text-white">{activeProtocols}</p>
                    <p className="text-gray-500 text-xs">Protocols</p>
                </div>
                <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-3 text-center">
                    <p className="text-xl font-bold text-white">{totalTxns}</p>
                    <p className="text-gray-500 text-xs">Transactions</p>
                </div>
            </div>

            {/* Top Connections */}
            <div>
                <div className="flex justify-between items-center mb-3">
                    <h2 className="text-white font-semibold">Top Connections</h2>
                    <button
                        onClick={onSeeAllClick}
                        className="text-blue-400 text-sm flex items-center gap-1"
                    >
                        See All <ChevronRight size={16} />
                    </button>
                </div>

                <div className="space-y-2">
                    {connections.slice(0, 5).map((node) => (
                        <button
                            key={node.id}
                            onClick={() => onConnectionClick(node)}
                            className="w-full bg-gray-900/50 border border-gray-800 rounded-xl p-4 flex items-center gap-3 text-left hover:border-gray-700 transition-colors"
                        >
                            {/* Avatar */}
                            <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-lg">
                                {getNodeEmoji(node.type)}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <p className="text-white font-medium truncate">{node.label}</p>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    {getDirectionIcon(node)}
                                    <span>{node.txCount || 0} txns</span>
                                </div>
                            </div>

                            {/* Value */}
                            <div className="text-right">
                                <p className="text-green-400 font-semibold">
                                    {formatVolume(node.value || 0)}
                                </p>
                            </div>

                            <ChevronRight size={18} className="text-gray-600" />
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
