import { GraphNode, NodeType } from '@/types/graph';

// Protocol logo mapping
export const PROTOCOL_LOGOS: Record<string, string> = {
    // Exchanges
    '0x28c6c06298d514db089934071355e5743bf21d60': 'https://cryptologos.cc/logos/binance-coin-bnb-logo.png', // Binance
    '0x21a31ee1afc51d94c2efccaa2092ad1028285549': 'https://cryptologos.cc/logos/binance-coin-bnb-logo.png', // Binance
    '0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be': 'https://cryptologos.cc/logos/binance-coin-bnb-logo.png', // Binance
    '0xba12222222228d8ba445958a75a0704d566bf2c8': 'https://cryptologos.cc/logos/balancer-bal-logo.png', // Balancer
    '0xdef1c0ded9bec7f1a1670819833240f027b25eff': 'https://cryptologos.cc/logos/0x-zrx-logo.png', // 0x
    '0x1111111254fb6c44bac0bed2854e76f90643097d': 'https://cryptologos.cc/logos/1inch-1inch-logo.png', // 1inch

    // DEXs / DeFi
    '0x7a250d5630b4cf539739df2c5dacb4c659f2488d': 'https://cryptologos.cc/logos/uniswap-uni-logo.png', // Uniswap V2
    '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45': 'https://cryptologos.cc/logos/uniswap-uni-logo.png', // Uniswap V3
    '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640': 'https://cryptologos.cc/logos/uniswap-uni-logo.png', // Uniswap V3 USDC/ETH
    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png', // USDC
    '0xdac17f958d2ee523a2206206994597c13d831ec7': 'https://cryptologos.cc/logos/tether-usdt-logo.png', // USDT
    '0x6b175474e89094c44da98b954eedeac495271d0f': 'https://cryptologos.cc/logos/dai-dai-logo.png', // DAI
    '0x5f98805a4e8be255a32880fdec7f6728c6568ba0': 'https://cryptologos.cc/logos/lido-dao-ldo-logo.png', // LIDO
    '0xae7ab96520de3a18e5e111b5eaab095312d7fe84': 'https://cryptologos.cc/logos/lido-dao-ldo-logo.png', // stETH
    '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': 'https://cryptologos.cc/logos/ethereum-eth-logo.png', // WETH
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
    const label = (node.displayName || node.label || '').toLowerCase();

    // 1. Check known protocol logos by address
    if (PROTOCOL_LOGOS[id]) {
        return { type: 'image', value: PROTOCOL_LOGOS[id] };
    }

    // 2. Main user or specific large entities -> Effigy (Blockies/ENS)
    if (node.type === 'main') {
        return { type: 'image', value: `https://effigy.im/a/${node.id}.png` };
    }

    // 3. Dynamic Logo Lookup based on label/name
    // This catches "Uniswap", "Aave", "Coinbase", "Binance", etc. in the label
    if (label.includes('uniswap')) return { type: 'image', value: 'https://cryptologos.cc/logos/uniswap-uni-logo.png' };
    if (label.includes('aave')) return { type: 'image', value: 'https://cryptologos.cc/logos/aave-aave-logo.png' };
    if (label.includes('curve')) return { type: 'image', value: 'https://cryptologos.cc/logos/curve-dao-token-crv-logo.png' };
    if (label.includes('maker') || label.includes('dai')) return { type: 'image', value: 'https://cryptologos.cc/logos/maker-mkr-logo.png' };
    if (label.includes('compound')) return { type: 'image', value: 'https://cryptologos.cc/logos/compound-comp-logo.png' };
    if (label.includes('binance')) return { type: 'image', value: 'https://cryptologos.cc/logos/binance-coin-bnb-logo.png' };
    if (label.includes('coinbase')) return { type: 'image', value: 'https://cryptologos.cc/logos/coinbase-coin-logo.png' };
    if (label.includes('kraken')) return { type: 'image', value: 'https://assets.coingecko.com/coins/images/28739/small/Kraken_Bounty_Icon.png' };
    if (label.includes('metamask')) return { type: 'image', value: 'https://cryptologos.cc/logos/metamask-mask-logo.png' };
    if (label.includes('1inch')) return { type: 'image', value: 'https://cryptologos.cc/logos/1inch-1inch-logo.png' };
    if (label.includes('sushiswap')) return { type: 'image', value: 'https://cryptologos.cc/logos/sushiswap-sushi-logo.png' };
    if (label.includes('opensea')) return { type: 'image', value: 'https://opensea.io/static/images/logos/opensea.svg' };
    if (label.includes('usdc')) return { type: 'image', value: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png' };
    if (label.includes('usdt') || label.includes('tether')) return { type: 'image', value: 'https://cryptologos.cc/logos/tether-usdt-logo.png' };
    if (label.includes('weth') || label.includes('wrapped ether')) return { type: 'image', value: 'https://cryptologos.cc/logos/ethereum-eth-logo.png' };


    // 4. Default Emojis based on type if no specific match found
    switch (node.type) {
        case 'exchange': return { type: 'emoji', value: '🏦' };
        case 'highValue': return { type: 'emoji', value: '💎' };
        case 'receiver': return { type: 'emoji', value: '📥' };
        case 'sender': return { type: 'emoji', value: '💸' };
        default: return { type: 'emoji', value: '👛' };
    }
}
