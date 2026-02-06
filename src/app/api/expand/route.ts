import { getAlchemyClient } from '@/lib/alchemy';
import { AssetTransfersCategory } from 'alchemy-sdk';
import { NextRequest } from 'next/server';
import { NodeType, LinkDirection } from '@/types/graph';
import {
    getEthPrice,
    getTokenPrices,
    calculateUsdValue,
    extractTokenAddresses
} from '@/lib/price-service';

// Known exchange addresses (simplified list)
const KNOWN_EXCHANGES = new Set([
    '0x28c6c06298d514db089934071355e5743bf21d60', // Binance
    '0x21a31ee1afc51d94c2efccaa2092ad1028285549', // Binance
    '0xdfd5293d8e347dfe59e90efd55b2956a1343963d', // Binance
    '0x56eddb7aa87536c09ccc2793473599fd21a8b17f', // Coinbase
]);

export async function GET(req: NextRequest) {
    const address = req.nextUrl.searchParams.get('address');
    const chainIdParam = req.nextUrl.searchParams.get('chainId');
    const chainId = chainIdParam ? parseInt(chainIdParam, 10) : 1; // Default to Ethereum Mainnet

    if (!address) {
        return Response.json({ error: 'Address required' }, { status: 400 });
    }

    const normalizedAddress = address.toLowerCase();
    const alchemy = getAlchemyClient(chainId);

    console.log(`[Expand API] Fetching for ${normalizedAddress} on chain ${chainId}`);

    try {
        const currentBlock = await alchemy.core.getBlockNumber();
        const blocksPerDay = 24 * 60 * 5;
        // Increase lookback to ~180 days (6 months) to catch more history for less active wallets
        const fromBlock = Math.max(0, currentBlock - 180 * blocksPerDay);

        const [inbound, outbound] = await Promise.all([
            alchemy.core.getAssetTransfers({
                fromBlock: `0x${fromBlock.toString(16)}`,
                toAddress: normalizedAddress,
                category: [AssetTransfersCategory.EXTERNAL, AssetTransfersCategory.ERC20],
                maxCount: 50,
            }),
            alchemy.core.getAssetTransfers({
                fromBlock: `0x${fromBlock.toString(16)}`,
                fromAddress: normalizedAddress,
                category: [AssetTransfersCategory.EXTERNAL, AssetTransfersCategory.ERC20],
                maxCount: 50,
            }),
        ]);

        // Fetch prices in parallel
        const allTransfers = [...inbound.transfers, ...outbound.transfers];
        const tokenAddresses = extractTokenAddresses(allTransfers);

        const [ethPrice, tokenPrices] = await Promise.all([
            getEthPrice(),
            getTokenPrices(tokenAddresses),
        ]);

        console.log(`[Prices] ETH: $${ethPrice}, Tokens: ${tokenPrices.size} found`);

        // Track direction per counterparty (now with USD values)
        const counterpartyMap = new Map<
            string,
            {
                inValueUsd: number;
                outValueUsd: number;
                txCount: number;
                lastTimestamp: string;
            }
        >();

        // Helper to calculate USD value for a transfer
        const getTransferUsdValue = (tx: any): number => {
            const rawValue = parseFloat(tx.value?.toString() || '0');
            const tokenAddress = tx.rawContract?.address || null;
            const asset = tx.asset || null;

            return calculateUsdValue(rawValue, asset, tokenAddress, ethPrice, tokenPrices);
        };

        // Process inbound (others → main)
        inbound.transfers.forEach((tx) => {
            const sender = tx.from.toLowerCase();
            if (sender === normalizedAddress) return;

            const existing = counterpartyMap.get(sender) || {
                inValueUsd: 0, outValueUsd: 0, txCount: 0, lastTimestamp: '',
            };
            const txTimestamp = (tx as any).metadata?.blockTimestamp || '';
            const usdValue = getTransferUsdValue(tx);

            counterpartyMap.set(sender, {
                ...existing,
                inValueUsd: existing.inValueUsd + usdValue,
                txCount: existing.txCount + 1,
                lastTimestamp: txTimestamp > existing.lastTimestamp ? txTimestamp : existing.lastTimestamp,
            });
        });

        // Process outbound (main → others)
        outbound.transfers.forEach((tx) => {
            const receiver = tx.to?.toLowerCase();
            if (!receiver || receiver === normalizedAddress) return;

            const existing = counterpartyMap.get(receiver) || {
                inValueUsd: 0, outValueUsd: 0, txCount: 0, lastTimestamp: '',
            };
            const txTimestamp = (tx as any).metadata?.blockTimestamp || '';
            const usdValue = getTransferUsdValue(tx);

            counterpartyMap.set(receiver, {
                ...existing,
                outValueUsd: existing.outValueUsd + usdValue,
                txCount: existing.txCount + 1,
                lastTimestamp: txTimestamp > existing.lastTimestamp ? txTimestamp : existing.lastTimestamp,
            });
        });

        // Score and rank
        const ranked = [...counterpartyMap.entries()]
            .map(([addr, data]) => ({
                address: addr,
                ...data,
                totalValueUsd: data.inValueUsd + data.outValueUsd,
                score: (data.inValueUsd + data.outValueUsd) * 1.0 + data.txCount * 100, // Weight tx count more
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 20);

        // Determine top 3 by USD value for "highValue" type
        const valueRanked = [...ranked].sort((a, b) => b.totalValueUsd - a.totalValueUsd);
        const top3Values = new Set(valueRanked.slice(0, 3).map(x => x.address));

        // Build nodes with types
        const nodes = ranked.map((cp) => {
            let nodeType: NodeType = 'sender'; // default

            if (top3Values.has(cp.address)) {
                nodeType = 'highValue';
            } else if (KNOWN_EXCHANGES.has(cp.address)) {
                nodeType = 'exchange';
            } else if (cp.outValueUsd > cp.inValueUsd) {
                nodeType = 'receiver'; // main sent more to them
            } else {
                nodeType = 'sender'; // they sent more to main
            }

            return {
                id: cp.address,
                label: `${cp.address.slice(0, 6)}...${cp.address.slice(-4)}`,
                type: nodeType,
                value: cp.totalValueUsd, // NOW IN USD!
                txCount: cp.txCount,
            };
        });

        // Build links with direction
        const links = ranked.map((cp) => {
            let direction: LinkDirection = 'bidirectional';

            if (cp.inValueUsd > 0 && cp.outValueUsd === 0) {
                direction = 'inbound';
            } else if (cp.outValueUsd > 0 && cp.inValueUsd === 0) {
                direction = 'outbound';
            }

            return {
                id: [normalizedAddress, cp.address].sort().join('-'),
                source: normalizedAddress,
                target: cp.address,
                value: cp.totalValueUsd,
                txCount: cp.txCount,
                direction,
            };
        });

        return Response.json({ nodes, links });
    } catch (error) {
        const err = error as Error;
        console.error('Expand API error:', {
            message: err.message,
            name: err.name,
            apiKeyPresent: !!process.env.NEXT_PUBLIC_ALCHEMY_API_KEY,
        });
        return Response.json(
            { error: 'Failed to fetch wallet data', details: err.message },
            { status: 500 }
        );
    }
}
