'use client';
import { useGraphStore } from '@/stores/graphStore';
import { useIsMobile } from '@/hooks/useIsMobile';
import type { NodeCategory, GraphNode, GraphLink } from '@/types/graph';
import { useMemo } from 'react';

const CATEGORY_STYLES: Record<NodeCategory | string, { bg: string; text: string }> = {
    defi: { bg: 'bg-cyan-500/20', text: 'text-cyan-400' },
    tradfi: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
    cex: { bg: 'bg-indigo-500/20', text: 'text-indigo-400' },
    p2p: { bg: 'bg-slate-500/20', text: 'text-slate-400' },
};

function formatVolume(value: number): string {
    if (!value || value === 0) return '$0';
    if (value > 1e12) value = value / 1e18;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
}

export function NodeDetails() {
    const { selectedNode, selectNode, expandedNodes, graph } = useGraphStore();
    const isMobile = useIsMobile();

    const { totalTxCount, relatedNodes } = useMemo(() => {
        if (!selectedNode || !graph.links.length) return { totalTxCount: 0, relatedNodes: [] as GraphNode[] };
        const nodeId = selectedNode.id;
        let count = 0;
        const relatedIds = new Set<string>();
        for (const link of graph.links) {
            if (link.source === nodeId || link.target === nodeId) {
                count += link.txCount;
                const other = link.source === nodeId ? link.target : link.source;
                relatedIds.add(other);
            }
        }
        const nodes = graph.nodes.filter((n) => relatedIds.has(n.id));
        return { totalTxCount: count, relatedNodes: nodes };
    }, [selectedNode?.id, graph.nodes, graph.links]);

    if (!selectedNode) return null;

    const isExpanded = expandedNodes.has(selectedNode.id);
    const title = selectedNode.type === 'main' ? selectedNode.label : (selectedNode.displayName || selectedNode.label);
    const category = (selectedNode as { category?: NodeCategory }).category || 'p2p';
    const style = CATEGORY_STYLES[category] || CATEGORY_STYLES.p2p;
    const isAddress = /^0x[a-f0-9]{40}$/i.test(selectedNode.id);

    const content = (
        <>
            <button
                onClick={() => selectNode(null)}
                className="absolute top-3 right-3 text-gray-400 hover:text-white text-xl leading-none"
                aria-label="Close"
            >
                ×
            </button>

            <div className="space-y-4">
                <h3 className="text-white font-bold text-xl pr-8 leading-tight">
                    {title}
                </h3>

                <div className="flex flex-wrap gap-2">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${style.bg} ${style.text}`}>
                        {category}
                    </span>
                    <span className="inline-block px-2.5 py-1 rounded-full bg-slate-600/30 text-slate-300 text-xs">
                        {selectedNode.type}
                    </span>
                </div>

                <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">
                        {isAddress ? 'Address' : 'ID'}
                    </p>
                    <p className="text-gray-400 text-sm font-mono break-all">
                        {selectedNode.id}
                    </p>
                </div>

                {selectedNode.value != null && selectedNode.value > 0 && (
                    <div>
                        <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Volume</p>
                        <span className="text-emerald-400 text-xl font-bold">
                            {formatVolume(selectedNode.value)}
                        </span>
                    </div>
                )}

                {totalTxCount > 0 && (
                    <div>
                        <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Your history</p>
                        <p className="text-gray-300 text-sm">{totalTxCount} transaction{totalTxCount !== 1 ? 's' : ''} with this entity</p>
                    </div>
                )}

                {relatedNodes.length > 0 && (
                    <div>
                        <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Related</p>
                        <ul className="text-gray-400 text-sm space-y-1">
                            {relatedNodes.slice(0, 8).map((n) => (
                                <li key={n.id}>{n.displayName || n.label || n.id.slice(0, 10)}…</li>
                            ))}
                            {relatedNodes.length > 8 && <li className="text-gray-500">+{relatedNodes.length - 8} more</li>}
                        </ul>
                    </div>
                )}

                <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Status</p>
                    <span
                        className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${
                            selectedNode.isLoading
                                ? 'bg-amber-600/20 text-amber-400'
                                : isExpanded
                                    ? 'bg-emerald-600/20 text-emerald-400'
                                    : isAddress
                                        ? 'bg-slate-600/20 text-slate-400'
                                        : 'bg-slate-600/20 text-slate-400'
                        }`}
                    >
                        {selectedNode.isLoading ? 'Loading…' : isExpanded ? 'Expanded' : isAddress ? 'Click to expand' : 'Simulated'}
                    </span>
                </div>

                {isAddress && (
                    <div className="pt-3 border-t border-gray-700">
                        <a
                            href={`https://etherscan.io/address/${selectedNode.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                        >
                            View on Etherscan →
                        </a>
                    </div>
                )}
            </div>
        </>
    );

    // Mobile: Bottom sheet
    if (isMobile) {
        return (
            <div className="fixed bottom-0 left-0 right-0 bg-[#0F0F13] border-t border-gray-800/50 rounded-t-[32px] p-6 z-30 max-h-[85vh] overflow-y-auto shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.8)] pb-8">
                {/* Drag Handle */}
                <div className="w-12 h-1.5 bg-gray-800 rounded-full mx-auto mb-6 opacity-50" />
                {content}
            </div>
        );
    }

    // Desktop: Side panel
    return (
        <div className="absolute right-4 top-20 w-80 bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-xl p-4 z-20">
            {content}
        </div>
    );
}
