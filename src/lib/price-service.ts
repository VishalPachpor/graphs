/**
 * Price Service - DefiLlama Integration
 * 
 * Uses DefiLlama's free API to fetch token prices.
 * https://defillama.com/docs/api
 */

// Cache for prices (5 minute TTL)
const priceCache = new Map<string, { price: number; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ETH address constant (used by DefiLlama for native ETH)
const ETH_ADDRESS = '0x0000000000000000000000000000000000000000';
const WETH_ADDRESS = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';

interface TokenPriceData {
    price: number;
    decimals?: number;
    symbol?: string;
}

interface DefiLlamaResponse {
    coins: {
        [key: string]: {
            price: number;
            decimals?: number;
            symbol?: string;
            confidence?: number;
        };
    };
}

/**
 * Get ETH price in USD
 */
export async function getEthPrice(): Promise<number> {
    const cached = priceCache.get('ETH');
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.price;
    }

    try {
        // Use coingecko for ETH price (more reliable)
        const response = await fetch(
            'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
            { next: { revalidate: 300 } } // Cache for 5 min
        );

        if (!response.ok) {
            throw new Error(`CoinGecko API error: ${response.status}`);
        }

        const data = await response.json();
        const price = data.ethereum?.usd || 2600; // Fallback to ~$2600

        priceCache.set('ETH', { price, timestamp: Date.now() });
        return price;
    } catch (error) {
        console.error('Failed to fetch ETH price:', error);
        // Fallback to cached or default
        return cached?.price || 2600;
    }
}

/**
 * Batch fetch token prices from DefiLlama
 * 
 * @param tokenAddresses - Array of ERC-20 token contract addresses
 * @param chainId - Chain ID ('ethereum', 'polygon', 'arbitrum', etc.)
 * @returns Map of address -> price in USD
 */
export async function getTokenPrices(
    tokenAddresses: string[],
    chainId: string = 'ethereum'
): Promise<Map<string, TokenPriceData>> {
    const result = new Map<string, TokenPriceData>();

    if (tokenAddresses.length === 0) {
        return result;
    }

    // Check cache first
    const uncached: string[] = [];
    for (const addr of tokenAddresses) {
        const key = `${chainId}:${addr.toLowerCase()}`;
        const cached = priceCache.get(key);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            result.set(addr.toLowerCase(), { price: cached.price });
        } else {
            uncached.push(addr);
        }
    }

    if (uncached.length === 0) {
        return result;
    }

    try {
        // Build DefiLlama query string
        // Format: ethereum:0x...,ethereum:0x...
        const coinIds = uncached.map(addr => `${chainId}:${addr.toLowerCase()}`).join(',');
        const url = `https://coins.llama.fi/prices/current/${coinIds}`;

        const response = await fetch(url, {
            next: { revalidate: 300 },
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) {
            console.error(`DefiLlama API error: ${response.status}`);
            return result;
        }

        const data: DefiLlamaResponse = await response.json();

        // Process results
        for (const [coinId, info] of Object.entries(data.coins || {})) {
            // Extract address from "ethereum:0x..."
            const addr = coinId.split(':')[1]?.toLowerCase();
            if (addr && info.price !== undefined) {
                result.set(addr, {
                    price: info.price,
                    decimals: info.decimals,
                    symbol: info.symbol,
                });

                // Update cache
                priceCache.set(coinId, { price: info.price, timestamp: Date.now() });
            }
        }

        return result;
    } catch (error) {
        console.error('Failed to fetch token prices:', error);
        return result;
    }
}

/**
 * Calculate USD value for a transfer
 * 
 * @param value - The raw value from Alchemy (already normalized for decimals)
 * @param asset - Asset symbol (e.g., 'ETH', 'USDC')
 * @param tokenAddress - ERC-20 contract address (null for ETH)
 * @param ethPrice - Current ETH price
 * @param tokenPrices - Map of token address -> price data
 */
export function calculateUsdValue(
    value: number,
    asset: string | null,
    tokenAddress: string | null,
    ethPrice: number,
    tokenPrices: Map<string, TokenPriceData>
): number {
    if (value === 0 || value === null || value === undefined) {
        return 0;
    }

    // Native ETH transfer
    if (!tokenAddress || asset === 'ETH') {
        return value * ethPrice;
    }

    // ERC-20 token transfer
    const priceData = tokenPrices.get(tokenAddress.toLowerCase());
    if (priceData) {
        // Alchemy already returns value normalized (e.g., 1000 USDC, not 1000000000)
        return value * priceData.price;
    }

    // Unknown token - return 0 (don't show fake values)
    return 0;
}

/**
 * Extract unique token addresses from Alchemy transfers
 */
export function extractTokenAddresses(transfers: any[]): string[] {
    const addresses = new Set<string>();

    for (const tx of transfers) {
        // Skip native ETH transfers
        if (tx.rawContract?.address && tx.rawContract.address !== ETH_ADDRESS) {
            addresses.add(tx.rawContract.address.toLowerCase());
        }
    }

    return [...addresses];
}
