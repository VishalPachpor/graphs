'use client';

import { useState } from 'react';
import { useGraphStore } from '@/stores/graphStore';
import { GraphNode } from '@/types/graph';
import { Search, ArrowUpRight, ArrowDownLeft, ArrowLeftRight, ChevronRight } from 'lucide-react';

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

// Get node type label
function getNodeTypeLabel(type: string): string {
    switch (type) {
        case 'exchange': return 'Exchange';
        case 'highValue': return 'High Value';
        case 'receiver': return 'Receiver';
        case 'sender': return 'Sender';
        default: return 'Wallet';
    }
}

interface ConnectionsListProps {
    onConnectionClick: (node: GraphNode) => void;
}

type FilterType = 'all' | 'inbound' | 'outbound' | 'highValue';

export function ConnectionsList({ onConnectionClick }: ConnectionsListProps) {
    const { graph } = useGraphStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState<FilterType>('all');

    // Get connected nodes (excluding main)
    const connections = graph.nodes.filter((n) => n.type !== 'main');

    // Apply filters
    const filteredConnections = connections
        .filter((node) => {
            // Text search
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                if (!node.id.toLowerCase().includes(query) && !node.label.toLowerCase().includes(query)) {
                    return false;
                }
            }

            // Type filter
            if (filter === 'highValue' && node.type !== 'highValue') return false;
            if (filter === 'inbound') {
                const link = graph.links.find((l) => l.target === node.id || l.source === node.id);
                if (link?.direction !== 'inbound') return false;
            }
            if (filter === 'outbound') {
                const link = graph.links.find((l) => l.target === node.id || l.source === node.id);
                if (link?.direction !== 'outbound') return false;
            }

            return true;
        })
        .sort((a, b) => (b.value || 0) - (a.value || 0));

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

    const filterButtons: { id: FilterType; label: string }[] = [
        { id: 'all', label: 'All' },
        { id: 'inbound', label: '↓ In' },
        { id: 'outbound', label: '↑ Out' },
        { id: 'highValue', label: '💎 Whales' },
    ];

    return (
        <div className="px-4 pt-4 space-y-4">
            {/* Search Bar */}
            <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                    type="text"
                    placeholder="Search connections..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
            </div>

            {/* Filters */}
            <div className="flex gap-2 overflow-x-auto pb-1">
                {filterButtons.map((btn) => (
                    <button
                        key={btn.id}
                        onClick={() => setFilter(btn.id)}
                        className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${filter === btn.id
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                            }`}
                    >
                        {btn.label}
                    </button>
                ))}
            </div>

            {/* Results Count */}
            <p className="text-gray-500 text-sm">
                {filteredConnections.length} connection{filteredConnections.length !== 1 ? 's' : ''}
            </p>

            {/* Connection List */}
            <div className="space-y-2 pb-4">
                {filteredConnections.map((node) => (
                    <button
                        key={node.id}
                        onClick={() => onConnectionClick(node)}
                        className="w-full bg-gray-900/50 border border-gray-800 rounded-xl p-4 flex items-center gap-3 text-left hover:border-gray-700 transition-colors"
                    >
                        {/* Avatar */}
                        <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center text-xl">
                            {getNodeEmoji(node.type)}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <p className="text-white font-medium truncate">{node.label}</p>
                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                <span className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400">
                                    {getNodeTypeLabel(node.type)}
                                </span>
                                <span className="flex items-center gap-1">
                                    {getDirectionIcon(node)}
                                    {node.txCount || 0} txns
                                </span>
                            </div>
                        </div>

                        {/* Value */}
                        <div className="text-right">
                            <p className="text-green-400 font-semibold text-lg">
                                {formatVolume(node.value || 0)}
                            </p>
                        </div>

                        <ChevronRight size={20} className="text-gray-600 flex-shrink-0" />
                    </button>
                ))}

                {filteredConnections.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                        <p>No connections found</p>
                    </div>
                )}
            </div>
        </div>
    );
}
