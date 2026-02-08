import { GraphNode, NodeType } from '@/types/graph';

// Protocol logo mapping
export const PROTOCOL_LOGOS: Record<string, string> = {
    '0x28c6c06298d514db089934071355e5743bf21d60': 'https://cryptologos.cc/logos/binance-coin-bnb-logo.png',
    '0x21a31ee1afc51d94c2efccaa2092ad1028285549': 'https://cryptologos.cc/logos/binance-coin-bnb-logo.png',
    '0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be': 'https://cryptologos.cc/logos/binance-coin-bnb-logo.png',
    '0x7a250d5630b4cf539739df2c5dacb4c659f2488d': 'https://cryptologos.cc/logos/uniswap-uni-logo.png',
};

// Helper to determine node color based on type
export function getNodeColor(type: string): string {
    switch (type) {
        case 'highValue': return '#8B5CF6'; // Purple
        case 'exchange': return '#3B82F6';  // Blue
        case 'sender': return '#EF4444';    // Red
        case 'receiver': return '#10B981';  // Emerald
        default: return '#6366F1';          // Indigo
    }
}

// Helper to resolve node content (Image URL or Emoji)
export function getNodeContent(node: GraphNode): { type: 'image' | 'emoji'; value: string } {
    const id = node.id.toLowerCase();

    // 1. Check known protocol logos first
    if (PROTOCOL_LOGOS[id]) {
        return { type: 'image', value: PROTOCOL_LOGOS[id] };
    }

    // 2. Main user or specific large entities -> Effigy (Blockies/ENS)
    if (node.type === 'main') {
        return { type: 'image', value: `https://effigy.im/a/${node.id}.png` };
    }

    // 3. Fallback to Emojis based on label/type
    const label = node.label.toLowerCase();
    if (label.includes('uniswap')) return { type: 'emoji', value: '🦄' };
    if (label.includes('aave')) return { type: 'emoji', value: '👻' };
    if (label.includes('curve')) return { type: 'emoji', value: '🌈' };
    if (label.includes('maker')) return { type: 'emoji', value: '🏦' };

    switch (node.type) {
        case 'exchange': return { type: 'emoji', value: '🏦' };
        case 'highValue': return { type: 'emoji', value: '💎' };
        case 'receiver': return { type: 'emoji', value: '📥' };
        case 'sender': return { type: 'emoji', value: '💸' };
        default: return { type: 'emoji', value: '👛' };
    }
}
