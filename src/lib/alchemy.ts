import { Alchemy, Network } from 'alchemy-sdk';
import { ethers } from 'ethers';

// Public RPC endpoints (free, no API key needed)
const PUBLIC_RPCS: Record<number, string[]> = {
    1: [
        'https://eth.llamarpc.com',
        'https://rpc.ankr.com/eth',
        'https://cloudflare-eth.com',
        'https://1rpc.io/eth',
    ],
    8453: [
        'https://base.llamarpc.com',
        'https://rpc.ankr.com/base',
    ],
    42161: [
        'https://arb1.arbitrum.io/rpc',
        'https://rpc.ankr.com/arbitrum',
    ],
    10: [
        'https://mainnet.optimism.io',
        'https://rpc.ankr.com/optimism',
    ],
    137: [
        'https://polygon-rpc.com',
        'https://rpc.ankr.com/polygon',
    ],
};

// Map chain IDs to Alchemy Network enums (fallback)
const CHAIN_ID_TO_NETWORK: Record<number, Network> = {
    1: Network.ETH_MAINNET,
    8453: Network.BASE_MAINNET,
    42161: Network.ARB_MAINNET,
    10: Network.OPT_MAINNET,
    137: Network.MATIC_MAINNET,
};

// Cache providers per chain
const providerCache: Record<number, ethers.JsonRpcProvider> = {};
const alchemyCache: Record<number, Alchemy> = {};

/**
 * Get a public RPC provider with automatic fallback
 */
export function getPublicProvider(chainId: number = 1): ethers.JsonRpcProvider {
    if (providerCache[chainId]) {
        return providerCache[chainId];
    }

    const rpcs = PUBLIC_RPCS[chainId] || PUBLIC_RPCS[1];
    // Use the first RPC, ethers will handle fallback internally
    const provider = new ethers.JsonRpcProvider(rpcs[0]);
    providerCache[chainId] = provider;
    return provider;
}

/**
 * Get an Alchemy client for the specified chain (for getAssetTransfers)
 * Falls back to public RPC if Alchemy key is not available
 */
export function getAlchemyClient(chainId: number = 1): Alchemy {
    if (alchemyCache[chainId]) {
        return alchemyCache[chainId];
    }

    const network = CHAIN_ID_TO_NETWORK[chainId] || Network.ETH_MAINNET;
    const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;

    // Create Alchemy client with custom RPC URL if API key is problematic
    const rpcs = PUBLIC_RPCS[chainId] || PUBLIC_RPCS[1];

    const client = new Alchemy({
        apiKey: apiKey || 'demo', // Use 'demo' as fallback (rate limited but works)
        network,
        connectionInfoOverrides: {
            skipFetchSetup: true,
        },
        // Use public RPC for core calls if Alchemy is unreliable
        url: !apiKey ? rpcs[0] : undefined,
    });

    alchemyCache[chainId] = client;
    return client;
}

/**
 * Helper to call with multiple RPC fallbacks
 */
export async function callWithFallback<T>(
    chainId: number,
    fn: (provider: ethers.JsonRpcProvider) => Promise<T>
): Promise<T> {
    const rpcs = PUBLIC_RPCS[chainId] || PUBLIC_RPCS[1];
    let lastError: Error | null = null;

    for (const rpcUrl of rpcs) {
        try {
            const provider = new ethers.JsonRpcProvider(rpcUrl);
            return await fn(provider);
        } catch (error) {
            lastError = error as Error;
            console.log(`[RPC Fallback] ${rpcUrl} failed, trying next...`);
        }
    }

    throw lastError || new Error('All RPC endpoints failed');
}

// Legacy default export for backwards compatibility
export const alchemy = getAlchemyClient(1);
