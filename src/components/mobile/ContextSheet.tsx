'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { GraphNode } from '@/types/graph';
import { X, ExternalLink, MessageSquare, Repeat, Send } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getNodeColor, getNodeContent } from '@/utils/mobileGraphUtils';

interface ContextSheetProps {
    node: GraphNode | null;
    isOpen: boolean;
    onClose: () => void;
    onAIChat?: () => void;
}

export function ContextSheet({ node, isOpen, onClose, onAIChat }: ContextSheetProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    // Reset expansion state when node changes
    useEffect(() => {
        if (isOpen) setIsExpanded(false);
    }, [isOpen, node]);

    if (!node) return null;

    return (
        <AnimatePresence mode="wait">
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40"
                    />

                    {/* Sheet */}
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        drag="y"
                        dragConstraints={{ top: 0 }}
                        dragElastic={0.2}
                        onDragEnd={(_, info) => {
                            if (info.offset.y > 100) onClose();
                        }}
                        className="fixed bottom-0 left-0 right-0 z-50 bg-[#0F0F13]/90 backdrop-blur-xl border-t border-white/10 rounded-t-3xl overflow-hidden shadow-[0_-10px_40px_rgba(0,0,0,0.5)]"
                        style={{ height: 'auto', maxHeight: '85vh' }}
                    >
                        {/* Drag Handle */}
                        <div className="w-full h-8 flex items-center justify-center pt-2 pb-4" onClick={() => setIsExpanded(!isExpanded)}>
                            <div className="w-12 h-1.5 rounded-full bg-white/20" />
                        </div>

                        {/* Content */}
                        <div className="px-6 pb-10 space-y-6">
                            {/* Header */}
                            <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="w-10 h-10 rounded-full flex items-center justify-center text-xl overflow-hidden"
                                            style={{ backgroundColor: getNodeColor(node.type) + '33', color: getNodeColor(node.type) }}
                                        >
                                            {(() => {
                                                const content = getNodeContent(node);
                                                return content.type === 'image' ? (
                                                    <img src={content.value} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    content.value
                                                );
                                            })()}
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-white">{node.label}</h2>
                                            <p className="text-sm text-white/50 font-mono">{truncateAddress(node.id)}</p>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 -mr-2 text-white/40 hover:text-white transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                                    <p className="text-xs text-white/40 mb-1">Total Volume</p>
                                    <p className="text-lg font-semibold text-white">
                                        ${(node.value || 0).toLocaleString()}
                                    </p>
                                </div>
                                <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                                    <p className="text-xs text-white/40 mb-1">Trust Score</p>
                                    <p className="text-lg font-semibold text-emerald-400">
                                        98/100
                                    </p>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-medium text-white/60">Actions</h3>
                                <div className="grid grid-cols-3 gap-3">
                                    <ActionButton
                                        icon={<MessageSquare size={20} />}
                                        label="Chat"
                                        primary
                                        onClick={onAIChat}
                                    />
                                    <ActionButton icon={<Repeat size={20} />} label="Swap" />
                                    <ActionButton icon={<Send size={20} />} label="Send" />
                                </div>
                            </div>

                            {/* Recent Activity (Fake Data) */}
                            <div className="space-y-3 pt-2">
                                <div className="flex items-center justify-between text-sm">
                                    <h3 className="font-medium text-white/60">Recent Activity</h3>
                                    <button className="text-indigo-400 hover:text-indigo-300">View All</button>
                                </div>
                                <div className="space-y-2">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs">
                                                    tx
                                                </div>
                                                <div>
                                                    <p className="text-sm text-white font-medium">Sent ETH</p>
                                                    <p className="text-xs text-white/40">2 mins ago</p>
                                                </div>
                                            </div>
                                            <span className="text-sm font-mono text-white/80">-0.5 ETH</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

function ActionButton({ icon, label, primary, onClick }: { icon: React.ReactNode, label: string, primary?: boolean, onClick?: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl transition-all active:scale-95 ${primary
                ? 'bg-[#6366F1] text-white shadow-lg shadow-indigo-500/20'
                : 'bg-white/5 text-white/80 hover:bg-white/10 border border-white/5'
                }`}
        >
            {icon}
            <span className="text-xs font-medium">{label}</span>
        </button>
    );
}

// Helpers 
function truncateAddress(address: string) {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
