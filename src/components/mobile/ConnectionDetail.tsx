'use client';

import { GraphNode } from '@/types/graph';
import { useGraphStore } from '@/stores/graphStore';
import { ArrowLeft, ExternalLink, Copy, Share2, Flag, ArrowUpRight, ArrowDownLeft, ArrowLeftRight } from 'lucide-react';

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

interface ConnectionDetailProps {
    node: GraphNode;
    onBack: () => void;
}

export function ConnectionDetail({ node, onBack }: ConnectionDetailProps) {
    const { graph, expandNode } = useGraphStore();

    // Find the link for this node
    const link = graph.links.find((l) => l.source === node.id || l.target === node.id);

    // Get direction info
    const getDirectionInfo = () => {
        if (!link) return { icon: <ArrowLeftRight className="text-purple-400" />, label: 'Bidirectional' };
        switch (link.direction) {
            case 'inbound':
                return { icon: <ArrowDownLeft className="text-green-400" />, label: 'Incoming' };
            case 'outbound':
                return { icon: <ArrowUpRight className="text-red-400" />, label: 'Outgoing' };
            default:
                return { icon: <ArrowLeftRight className="text-purple-400" />, label: 'Bidirectional' };
        }
    };

    const directionInfo = getDirectionInfo();

    const handleCopy = async () => {
        await navigator.clipboard.writeText(node.id);
    };

    const handleShare = async () => {
        if (navigator.share) {
            await navigator.share({
                title: `Wallet ${node.label}`,
                url: `https://etherscan.io/address/${node.id}`,
            });
        }
    };

    const handleExpand = () => {
        expandNode(node.id);
    };

    return (
        <div className="min-h-screen bg-[#0a0a0f]">
            {/* Header */}
            <div className="sticky top-0 bg-[#0a0a0f]/95 backdrop-blur-sm border-b border-gray-800 px-4 py-3 flex items-center gap-3 z-10">
                <button
                    onClick={onBack}
                    className="p-2 -ml-2 text-gray-400 hover:text-white"
                >
                    <ArrowLeft size={22} />
                </button>
                <h1 className="text-white font-semibold flex-1 truncate">{node.label}</h1>
            </div>

            <div className="px-4 py-6 space-y-6">
                {/* Avatar & Name */}
                <div className="text-center space-y-3">
                    <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center text-4xl mx-auto">
                        {getNodeEmoji(node.type)}
                    </div>
                    <div>
                        <p className="text-white text-lg font-semibold">{node.label}</p>
                        <p className="text-gray-500 text-sm font-mono break-all px-4">{node.id}</p>
                    </div>
                </div>

                {/* Volume Card */}
                <div className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 border border-green-500/30 rounded-2xl p-5 text-center">
                    <p className="text-3xl font-bold text-green-400">
                        {formatVolume(node.value || 0)}
                    </p>
                    <p className="text-gray-400 text-sm mt-1">Total Volume</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-3 text-center">
                        <p className="text-xl font-bold text-white">{node.txCount || 0}</p>
                        <p className="text-gray-500 text-xs">Transactions</p>
                    </div>
                    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-3 text-center flex flex-col items-center justify-center">
                        <div className="text-xl">{directionInfo.icon}</div>
                        <p className="text-gray-500 text-xs mt-1">{directionInfo.label}</p>
                    </div>
                    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-3 text-center">
                        <p className="text-xl font-bold text-white capitalize">{node.type}</p>
                        <p className="text-gray-500 text-xs">Type</p>
                    </div>
                </div>

                {/* Quick Actions */}
                <div>
                    <h3 className="text-gray-400 text-sm font-medium mb-3">Quick Actions</h3>
                    <div className="grid grid-cols-3 gap-3">
                        <button
                            onClick={handleCopy}
                            className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 flex flex-col items-center gap-2 hover:border-gray-700 transition-colors"
                        >
                            <Copy size={20} className="text-blue-400" />
                            <span className="text-white text-xs">Copy</span>
                        </button>
                        <button
                            onClick={handleShare}
                            className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 flex flex-col items-center gap-2 hover:border-gray-700 transition-colors"
                        >
                            <Share2 size={20} className="text-green-400" />
                            <span className="text-white text-xs">Share</span>
                        </button>
                        <button
                            className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 flex flex-col items-center gap-2 hover:border-gray-700 transition-colors"
                        >
                            <Flag size={20} className="text-orange-400" />
                            <span className="text-white text-xs">Flag</span>
                        </button>
                    </div>
                </div>

                {/* Expand Button */}
                <button
                    onClick={handleExpand}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-xl transition-colors"
                >
                    Explore Connections
                </button>

                {/* External Links */}
                <div className="space-y-2">
                    <a
                        href={`https://etherscan.io/address/${node.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between bg-gray-900/50 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors"
                    >
                        <span className="text-white">View on Etherscan</span>
                        <ExternalLink size={18} className="text-gray-500" />
                    </a>
                    <a
                        href={`https://debank.com/profile/${node.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between bg-gray-900/50 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors"
                    >
                        <span className="text-white">View on DeBank</span>
                        <ExternalLink size={18} className="text-gray-500" />
                    </a>
                </div>
            </div>
        </div>
    );
}
