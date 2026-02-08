'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, Brain, Check } from 'lucide-react';
import { useGraphStore, type GraphMode, type TimeRange } from '@/stores/graphStore';
import type { NodeCategory } from '@/types/graph';

interface MobileFilterSheetProps {
    isOpen: boolean;
    onClose: () => void;
}

const TIME_RANGES: { value: TimeRange; label: string }[] = [
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
    { value: '90d', label: '90 Days' },
    { value: 'all', label: 'All Time' },
];

const CATEGORIES: { id: NodeCategory; label: string; emoji: string }[] = [
    { id: 'defi', label: 'DeFi', emoji: '🔮' },
    { id: 'tradfi', label: 'TradFi', emoji: '🏦' },
    { id: 'cex', label: 'CEX', emoji: '💱' },
    { id: 'p2p', label: 'P2P', emoji: '👛' },
];

export function MobileFilterSheet({ isOpen, onClose }: MobileFilterSheetProps) {
    const graphMode = useGraphStore((s) => s.graphMode);
    const setGraphMode = useGraphStore((s) => s.setGraphMode);
    const timeRange = useGraphStore((s) => s.timeRange);
    const setTimeRange = useGraphStore((s) => s.setTimeRange);
    const filterCategories = useGraphStore((s) => s.filterCategories);
    const setFilterCategories = useGraphStore((s) => s.setFilterCategories);
    const loadFullGraph = useGraphStore((s) => s.loadFullGraph);

    // Local state for pending changes
    const [pendingMode, setPendingMode] = useState<GraphMode>(graphMode);
    const [pendingTime, setPendingTime] = useState<TimeRange>(timeRange);
    const [pendingCategories, setPendingCategories] = useState<NodeCategory[]>(filterCategories);

    // Sync when sheet opens
    useState(() => {
        if (isOpen) {
            setPendingMode(graphMode);
            setPendingTime(timeRange);
            setPendingCategories(filterCategories);
        }
    });

    // Shake animation state
    const [shakeCategory, setShakeCategory] = useState<NodeCategory | null>(null);

    const toggleCategory = (cat: NodeCategory) => {
        if (pendingCategories.includes(cat)) {
            if (pendingCategories.length > 1) {
                setPendingCategories(pendingCategories.filter((c) => c !== cat));
            } else {
                // Trigger shake animation if trying to uncheck last category
                setShakeCategory(cat);
                setTimeout(() => setShakeCategory(null), 500);
            }
        } else {
            setPendingCategories([...pendingCategories, cat]);
        }
    };

    const handleApply = () => {
        setGraphMode(pendingMode);
        setTimeRange(pendingTime);
        setFilterCategories(pendingCategories);
        loadFullGraph();
        onClose();
    };

    const hasChanges =
        pendingMode !== graphMode ||
        pendingTime !== timeRange ||
        JSON.stringify(pendingCategories.sort()) !== JSON.stringify(filterCategories.sort());

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
                        drag="y"
                        dragConstraints={{ top: 0 }}
                        dragElastic={0.2}
                        onDragEnd={(_, info) => {
                            if (info.offset.y > 100) onClose();
                        }}
                        className="fixed bottom-0 left-0 right-0 z-50 bg-[#0F0F13]/95 backdrop-blur-xl border-t border-white/10 rounded-t-3xl overflow-hidden"
                    >
                        {/* Drag Handle */}
                        <div className="w-full h-6 flex items-center justify-center pt-2">
                            <div className="w-10 h-1 rounded-full bg-white/20" />
                        </div>

                        {/* Header */}
                        <div className="flex items-center justify-between px-5 pb-4">
                            <h2 className="text-lg font-semibold text-white">Filters</h2>
                            <button
                                onClick={onClose}
                                className="p-2 -mr-2 text-white/40 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="px-5 pb-8 space-y-6">
                            {/* Graph Mode */}
                            <div className="space-y-3">
                                <p className="text-xs text-white/40 uppercase tracking-wider">Graph Mode</p>
                                <div className="flex gap-2">
                                    <ModeButton
                                        active={pendingMode === 'transaction'}
                                        onClick={() => setPendingMode('transaction')}
                                        icon={<Zap size={18} />}
                                        label="Transaction"
                                        color="slate"
                                    />
                                    <ModeButton
                                        active={false}
                                        onClick={() => { }}
                                        icon={<Brain size={18} />}
                                        label="Memory"
                                        color="violet"
                                        disabled
                                    />
                                </div>
                                <p className="text-xs text-white/30 italic">
                                    Memory mode requires API configuration
                                </p>
                            </div>

                            {/* Time Range */}
                            <div className="space-y-3">
                                <p className="text-xs text-white/40 uppercase tracking-wider">Time Range</p>
                                <div className="flex flex-wrap gap-2">
                                    {TIME_RANGES.map(({ value, label }) => (
                                        <button
                                            key={value}
                                            onClick={() => setPendingTime(value)}
                                            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${pendingTime === value
                                                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                                                : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
                                                }`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Categories */}
                            <div className="space-y-3">
                                <p className="text-xs text-white/40 uppercase tracking-wider">Show Categories</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {CATEGORIES.map(({ id, label, emoji }) => (
                                        <button
                                            key={id}
                                            onClick={() => toggleCategory(id)}
                                            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${shakeCategory === id ? 'animate-shake bg-red-500/10 border-red-500/30' : ''
                                                } ${pendingCategories.includes(id)
                                                    ? 'bg-white/10 text-white border border-white/20'
                                                    : 'bg-white/5 text-white/40 border border-transparent'
                                                }`}
                                        >
                                            <span className="text-lg">{emoji}</span>
                                            <span className="flex-1 text-left">{label}</span>
                                            {pendingCategories.includes(id) && (
                                                <Check size={16} className="text-emerald-400" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Apply Button */}
                            <button
                                onClick={handleApply}
                                disabled={!hasChanges}
                                className={`w-full py-4 rounded-2xl text-base font-semibold transition-all ${hasChanges
                                    ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/30 active:scale-[0.98]'
                                    : 'bg-white/5 text-white/30 cursor-not-allowed'
                                    }`}
                            >
                                {hasChanges ? 'Apply Filters' : 'No Changes'}
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

function ModeButton({
    active,
    onClick,
    icon,
    label,
    color,
    disabled = false
}: {
    active: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
    color: 'slate' | 'violet';
    disabled?: boolean;
}) {
    const activeClasses = color === 'violet'
        ? 'bg-violet-500/20 text-violet-300 border-violet-500/50'
        : 'bg-slate-500/20 text-slate-300 border-slate-500/50';

    return (
        <button
            onClick={disabled ? undefined : onClick}
            disabled={disabled}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-medium border transition-all ${disabled
                ? 'bg-white/5 text-white/20 border-transparent cursor-not-allowed opacity-50'
                : active
                    ? activeClasses
                    : 'bg-white/5 text-white/50 border-transparent hover:bg-white/10'
                }`}
        >
            {icon}
            {label}
        </button>
    );
}

