'use client';

import { motion } from 'framer-motion';
import { GraphNode } from '@/types/graph';

interface OrbitNodeProps {
    node: GraphNode;
    x: number;
    y: number;
    isActive?: boolean;
    onClick: () => void;
}

// Protocol logo mapping
const protocolLogos: Record<string, string> = {
    'hyperliquid': '⚡',
    'uniswap': '🦄',
    'aave': '👻',
    'coinbase': '🔵',
    'binance': '🟡',
};

// Get logo for node
function getNodeLogo(node: GraphNode): string {
    const label = node.label.toLowerCase();
    for (const [key, emoji] of Object.entries(protocolLogos)) {
        if (label.includes(key)) return emoji;
    }

    switch (node.type) {
        case 'exchange': return '🏦';
        case 'highValue': return '💎';
        case 'receiver': return '📥';
        case 'sender': return '💸';
        default: return '◯';
    }
}

export function OrbitNode({ node, x, y, isActive = false, onClick }: OrbitNodeProps) {
    const logo = getNodeLogo(node);
    const hasWarning = node.value && node.value < 0;

    return (
        <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{
                scale: 1,
                opacity: 1,
                x,
                y,
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            transition={{
                type: 'spring',
                damping: 20,
                stiffness: 100,
            }}
            onClick={onClick}
            className="absolute flex flex-col items-center gap-1 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        >
            {/* Glow effect for active nodes */}
            {isActive && (
                <motion.div
                    className="absolute inset-0 rounded-full"
                    style={{
                        background: 'radial-gradient(circle, rgba(99,102,241,0.4) 0%, transparent 70%)',
                        filter: 'blur(12px)',
                    }}
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.5, 0.8, 0.5],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                />
            )}

            {/* Node circle */}
            <div className="relative">
                <motion.div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-2xl"
                    style={{
                        background: 'rgba(255,255,255,0.05)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        boxShadow: isActive
                            ? '0 0 20px rgba(99,102,241,0.3)'
                            : '0 4px 20px rgba(0,0,0,0.3)',
                    }}
                    animate={isActive ? {
                        scale: [1, 1.05, 1],
                    } : {}}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                >
                    {logo}
                </motion.div>

                {/* Warning badge */}
                {hasWarning && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center text-xs">
                        ⚠️
                    </div>
                )}
            </div>

            {/* Label */}
            <span className="text-[10px] text-gray-400 max-w-16 truncate text-center">
                {node.label.length > 10
                    ? `${node.label.slice(0, 4)}...${node.label.slice(-4)}`
                    : node.label
                }
            </span>
        </motion.button>
    );
}
