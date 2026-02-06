'use client';
import { useGraphStore } from '@/stores/graphStore';
import { useIsMobile } from '@/hooks/useIsMobile';

// Format volume with proper Wei conversion and abbreviations
function formatVolume(value: number): string {
    if (!value || value === 0) return '$0';

    // If absurdly large (probably Wei), normalize
    if (value > 1e12) {
        value = value / 1e18;
    }

    // Format with abbreviations
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
}

export function NodeDetails() {
    const { selectedNode, selectNode, expandedNodes } = useGraphStore();
    const isMobile = useIsMobile();

    if (!selectedNode) return null;

    const isExpanded = expandedNodes.has(selectedNode.id);

    const content = (
        <>
            <button
                onClick={() => selectNode(null)}
                className="absolute top-3 right-3 text-gray-400 hover:text-white text-xl leading-none"
                aria-label="Close"
            >
                ×
            </button>

            <div className="space-y-3">
                {/* Label / ENS */}
                <h3 className="text-white font-bold text-lg truncate pr-8">
                    {selectedNode.label}
                </h3>

                {/* Full Address */}
                <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">
                        Address
                    </p>
                    <p className="text-gray-300 text-sm font-mono break-all">
                        {selectedNode.id}
                    </p>
                </div>

                {/* Type */}
                <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">
                        Type
                    </p>
                    <span className="inline-block px-2 py-1 rounded-full bg-blue-600/20 text-blue-400 text-xs">
                        {selectedNode.type}
                    </span>
                </div>

                {/* Volume */}
                {selectedNode.value && selectedNode.value > 0 && (
                    <div>
                        <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">
                            Volume
                        </p>
                        <span className="text-green-400 text-lg font-bold">
                            {formatVolume(selectedNode.value)}
                        </span>
                    </div>
                )}

                {/* Status */}
                <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">
                        Status
                    </p>
                    <span
                        className={`inline-block px-2 py-1 rounded-full text-xs ${selectedNode.isLoading
                            ? 'bg-yellow-600/20 text-yellow-400'
                            : isExpanded
                                ? 'bg-green-600/20 text-green-400'
                                : 'bg-gray-600/20 text-gray-400'
                            }`}
                    >
                        {selectedNode.isLoading
                            ? 'Loading...'
                            : isExpanded
                                ? 'Expanded'
                                : 'Click to expand'}
                    </span>
                </div>

                {/* External Links */}
                <div className="pt-2 border-t border-gray-700">
                    <a
                        href={`https://etherscan.io/address/${selectedNode.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 text-sm underline"
                    >
                        View on Etherscan ↗
                    </a>
                </div>
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
