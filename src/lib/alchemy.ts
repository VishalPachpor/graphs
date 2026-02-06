import { Alchemy, Network } from 'alchemy-sdk';

// Map chain IDs to Alchemy Network enums
const CHAIN_ID_TO_NETWORK: Record<number, Network> = {
    1: Network.ETH_MAINNET,
    8453: Network.BASE_MAINNET,
    42161: Network.ARB_MAINNET,
    10: Network.OPT_MAINNET,
    137: Network.MATIC_MAINNET,
};

// Cache Alchemy instances per chain
const alchemyInstances: Record<number, Alchemy> = {};

/**
 * Get an Alchemy client for the specified chain.
 * Defaults to Ethereum Mainnet if chainId is not supported.
 */
export function getAlchemyClient(chainId: number = 1): Alchemy {
    // Return cached instance if available
    if (alchemyInstances[chainId]) {
        return alchemyInstances[chainId];
    }

    const network = CHAIN_ID_TO_NETWORK[chainId] || Network.ETH_MAINNET;

    const client = new Alchemy({
        apiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY!,
        network,
        connectionInfoOverrides: {
            skipFetchSetup: true,
        },
    });

    alchemyInstances[chainId] = client;
    return client;
}

// Legacy default export for backwards compatibility
export const alchemy = getAlchemyClient(1);

