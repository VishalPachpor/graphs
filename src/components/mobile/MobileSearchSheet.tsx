'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Clock, ArrowRight } from 'lucide-react';
import { useGraphStore } from '@/stores/graphStore';

interface MobileSearchSheetProps {
    isOpen: boolean;
    onClose: () => void;
}

const RECENT_SEARCHES_KEY = 'graph-recent-searches';

export function MobileSearchSheet({ isOpen, onClose }: MobileSearchSheetProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [localQuery, setLocalQuery] = useState('');
    const [recentSearches, setRecentSearches] = useState<string[]>([]);

    const setSearchQuery = useGraphStore((s) => s.setSearchQuery);
    const graph = useGraphStore((s) => s.graph);

    // Load recent searches from localStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
            if (saved) {
                try {
                    setRecentSearches(JSON.parse(saved).slice(0, 5));
                } catch {
                    setRecentSearches([]);
                }
            }
        }
    }, []);

    // Focus input when sheet opens
    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [isOpen]);

    const expandNode = useGraphStore((s) => s.expandNode);
    const selectNode = useGraphStore((s) => s.selectNode);

    // Filter nodes based on query
    const matchingNodes = localQuery.trim()
        ? graph.nodes.filter((n) => {
            const text = `${n.label} ${n.id} ${n.displayName || ''}`.toLowerCase();
            return text.includes(localQuery.toLowerCase());
        })
        : [];

    const matchingCount = matchingNodes.length;

    const handleSearch = (query: string) => {
        setLocalQuery(query);
        // Don't set global search query while typing, only on selection
        // This prevents the graph from filtering down to 0 links while typing
    };

    const handleResultClick = (node: any) => {
        // 1. Select the node (camera will fly to it)
        selectNode(node);

        // 2. Expand it to load history/connections
        expandNode(node.id);

        // 3. Clear global search so we see the context (neighbors), not just the node
        setSearchQuery('');

        // 4. Save to recent
        addToRecent(node.displayName || node.label || node.id);

        onClose();
    };

    const handleSubmit = () => {
        if (!localQuery.trim()) return;

        // If it's an address, try to load it
        // If it's an address, load it
        if (/^0x[a-fA-F0-9]{40}$/.test(localQuery)) {
            // Initialize graph with this new root address
            useGraphStore.getState().initGraph(localQuery);
            useGraphStore.getState().expandNode(localQuery);
            setSearchQuery('');
        } else {
            setSearchQuery(localQuery);
        }

        addToRecent(localQuery);
        onClose();
    };

    const addToRecent = (term: string) => {
        const updated = [term, ...recentSearches.filter((s) => s !== term)].slice(0, 5);
        setRecentSearches(updated);
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    };

    const handleRecentClick = (query: string) => {
        setLocalQuery(query);
        setSearchQuery(query);
    };

    const handleClear = () => {
        setLocalQuery('');
        setSearchQuery('');
        inputRef.current?.focus();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                    />

                    {/* Sheet */}
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                        className="fixed bottom-0 left-0 right-0 z-50 bg-[#0F0F13]/95 backdrop-blur-xl border-t border-white/10 rounded-t-3xl overflow-hidden"
                        style={{ maxHeight: '70vh' }}
                    >
                        {/* Drag Handle */}
                        <div className="w-full h-6 flex items-center justify-center pt-2">
                            <div className="w-10 h-1 rounded-full bg-white/20" />
                        </div>

                        {/* Content */}
                        <div className="px-5 pb-8 space-y-5">
                            {/* Search Input */}
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">
                                    <Search size={20} />
                                </div>
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={localQuery}
                                    onChange={(e) => handleSearch(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                                    placeholder="Search wallets, protocols..."
                                    className="w-full pl-12 pr-12 py-4 rounded-2xl bg-white/5 border border-white/10 text-white text-lg placeholder-white/30 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                />
                                {localQuery && (
                                    <button
                                        onClick={handleClear}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/10 text-white/60 hover:bg-white/20 transition-colors"
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                            </div>

                            {/* Results List */}
                            {localQuery.trim() && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between px-1">
                                        <p className="text-white/60 text-sm">
                                            Found <span className="text-white font-semibold">{matchingCount}</span> matching {matchingCount === 1 ? 'result' : 'results'}
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        {matchingNodes.slice(0, 5).map((node) => (
                                            <button
                                                key={node.id}
                                                onClick={() => handleResultClick(node)}
                                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 text-left hover:bg-white/10 transition-colors border border-white/5"
                                            >
                                                <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-xl">
                                                    {/* Simple emoji mapping based on type */}
                                                    {node.type === 'exchange' ? '🏦' : node.type === 'highValue' ? '💎' : '👛'}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-white font-medium truncate">
                                                        {node.displayName || node.label || node.id}
                                                    </div>
                                                    <div className="text-white/40 text-xs truncate font-mono">
                                                        {node.id}
                                                    </div>
                                                </div>
                                                <div className="p-1.5 rounded-full bg-white/5 text-white/40">
                                                    <ArrowRight size={14} />
                                                </div>
                                            </button>
                                        ))}

                                        {/* Address Fallback if no local matches but looks like address */}
                                        {matchingCount === 0 && /^0x[a-fA-F0-9]{40}$/.test(localQuery) && (
                                            <button
                                                onClick={handleSubmit}
                                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-indigo-500/10 text-left hover:bg-indigo-500/20 transition-colors border border-indigo-500/20"
                                            >
                                                <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                                                    <Search size={18} />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="text-indigo-300 font-medium">
                                                        Load Address
                                                    </div>
                                                    <div className="text-indigo-300/60 text-xs">
                                                        Fetch data for this wallet
                                                    </div>
                                                </div>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Recent Searches */}
                            {!localQuery && recentSearches.length > 0 && (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-white/40 text-xs uppercase tracking-wider">
                                        <Clock size={12} />
                                        Recent Searches
                                    </div>
                                    <div className="space-y-1">
                                        {recentSearches.map((search, i) => (
                                            <button
                                                key={i}
                                                onClick={() => handleRecentClick(search)}
                                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 text-white/80 text-left hover:bg-white/10 transition-colors"
                                            >
                                                <Search size={14} className="text-white/30" />
                                                <span className="truncate">{search}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Empty State */}
                            {!localQuery && recentSearches.length === 0 && (
                                <div className="text-center py-8">
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                                        <Search size={24} className="text-white/30" />
                                    </div>
                                    <p className="text-white/40 text-sm">
                                        Search for wallets by address or label
                                    </p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
