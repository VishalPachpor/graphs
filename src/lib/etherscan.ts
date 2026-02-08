/**
 * Etherscan/Blockscout API for transaction history
 * Free, no API key required for basic usage
 */

// Free public APIs for transaction history
const EXPLORER_APIS: Record<number, { url: string; apiKey?: string }> = {
    1: { url: 'https://api.etherscan.io/api' },
    8453: { url: 'https://api.basescan.org/api' },
    42161: { url: 'https://api.arbiscan.io/api' },
    10: { url: 'https://api-optimistic.etherscan.io/api' },
    137: { url: 'https://api.polygonscan.com/api' },
};

interface EtherscanTx {
    hash: string;
    from: string;
    to: string;
    value: string;
    tokenSymbol?: string;
    tokenName?: string;
    tokenDecimal?: string;
    contractAddress?: string;
    timeStamp: string;
    blockNumber: string;
}

interface TransferResult {
    from: string;
    to: string;
    value: number;
    asset: string;
    hash: string;
    direction: 'inbound' | 'outbound';
    rawContract?: {
        address?: string;
    };
}

export interface TransferResponse {
    transfers: TransferResult[];
}

/**
 * Fetch normal ETH transactions from Etherscan-like APIs
 */
async function fetchNormalTransactions(
    address: string,
    chainId: number
): Promise<EtherscanTx[]> {
    const explorer = EXPLORER_APIS[chainId] || EXPLORER_APIS[1];
    const url = new URL(explorer.url);

    url.searchParams.set('module', 'account');
    url.searchParams.set('action', 'txlist');
    url.searchParams.set('address', address);
    url.searchParams.set('startblock', '0');
    url.searchParams.set('endblock', '99999999');
    url.searchParams.set('page', '1');
    url.searchParams.set('offset', '50');
    url.searchParams.set('sort', 'desc');

    if (explorer.apiKey) {
        url.searchParams.set('apikey', explorer.apiKey);
    }

    // Use longer timeout for slow networks (30 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
        const response = await fetch(url.toString(), { signal: controller.signal });
        clearTimeout(timeoutId);
        const data = await response.json();

        if (data.status === '1' && Array.isArray(data.result)) {
            return data.result;
        }

        console.log('[Etherscan] Normal tx response:', data.message || 'No results');
        return [];
    } catch (error: unknown) {
        clearTimeout(timeoutId);
        console.log('[Etherscan] Normal tx fetch failed:', (error as Error).message);
        throw error; // Rethrow to trigger fallback
    }
}

/**
 * Fetch ERC20 token transfers from Etherscan-like APIs
 */
async function fetchTokenTransfers(
    address: string,
    chainId: number
): Promise<EtherscanTx[]> {
    const explorer = EXPLORER_APIS[chainId] || EXPLORER_APIS[1];
    const url = new URL(explorer.url);

    url.searchParams.set('module', 'account');
    url.searchParams.set('action', 'tokentx');
    url.searchParams.set('address', address);
    url.searchParams.set('startblock', '0');
    url.searchParams.set('endblock', '99999999');
    url.searchParams.set('page', '1');
    url.searchParams.set('offset', '50');
    url.searchParams.set('sort', 'desc');

    if (explorer.apiKey) {
        url.searchParams.set('apikey', explorer.apiKey);
    }

    // Use longer timeout for slow networks (30 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
        const response = await fetch(url.toString(), { signal: controller.signal });
        clearTimeout(timeoutId);
        const data = await response.json();

        if (data.status === '1' && Array.isArray(data.result)) {
            return data.result;
        }

        console.log('[Etherscan] Token tx response:', data.message || 'No results');
        return [];
    } catch (error: unknown) {
        clearTimeout(timeoutId);
        console.log('[Etherscan] Token tx fetch failed:', (error as Error).message);
        throw error; // Rethrow to trigger fallback
    }
}

/**
 * Get asset transfers using Etherscan API (replacement for Alchemy's getAssetTransfers)
 */
export async function getAssetTransfersFromExplorer(
    address: string,
    chainId: number = 1
): Promise<{ inbound: TransferResponse; outbound: TransferResponse }> {
    const normalizedAddress = address.toLowerCase();

    console.log(`[Etherscan] Fetching transfers for ${normalizedAddress} on chain ${chainId}`);

    try {
        // Fetch both ETH and token transfers in parallel
        const [normalTxs, tokenTxs] = await Promise.all([
            fetchNormalTransactions(normalizedAddress, chainId),
            fetchTokenTransfers(normalizedAddress, chainId),
        ]);

        console.log(`[Etherscan] Found ${normalTxs.length} ETH txs, ${tokenTxs.length} token txs`);

        const inboundTransfers: TransferResult[] = [];
        const outboundTransfers: TransferResult[] = [];

        // Process normal ETH transactions
        for (const tx of normalTxs) {
            const value = parseFloat(tx.value) / 1e18;
            if (value === 0) continue; // Skip zero-value transactions

            const transfer: TransferResult = {
                from: tx.from.toLowerCase(),
                to: tx.to?.toLowerCase() || '',
                value,
                asset: 'ETH',
                hash: tx.hash,
                direction: tx.to?.toLowerCase() === normalizedAddress ? 'inbound' : 'outbound',
            };

            if (transfer.direction === 'inbound') {
                inboundTransfers.push(transfer);
            } else {
                outboundTransfers.push(transfer);
            }
        }

        // Process ERC20 token transfers
        for (const tx of tokenTxs) {
            const decimals = parseInt(tx.tokenDecimal || '18');
            const value = parseFloat(tx.value) / Math.pow(10, decimals);
            if (value === 0) continue;

            const transfer: TransferResult = {
                from: tx.from.toLowerCase(),
                to: tx.to?.toLowerCase() || '',
                value,
                asset: tx.tokenSymbol || 'TOKEN',
                hash: tx.hash,
                direction: tx.to?.toLowerCase() === normalizedAddress ? 'inbound' : 'outbound',
                rawContract: tx.contractAddress ? { address: tx.contractAddress } : undefined,
            };

            if (transfer.direction === 'inbound') {
                inboundTransfers.push(transfer);
            } else {
                outboundTransfers.push(transfer);
            }
        }

        return {
            inbound: { transfers: inboundTransfers },
            outbound: { transfers: outboundTransfers },
        };
    } catch (error) {
        console.error('[Etherscan] Error fetching transfers:', error);
        throw error; // Rethrow to trigger fallback
    }
}
