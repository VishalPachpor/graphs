import { callWithFallback } from '@/lib/alchemy';
import { getAssetTransfersFromExplorer } from '@/lib/etherscan';
import { NextRequest } from 'next/server';
import { NodeType, LinkDirection } from '@/types/graph';
import {
    getEthPrice,
    getTokenPrices,
    calculateUsdValue,
    extractTokenAddresses
} from '@/lib/price-service';
import {
    getSimulatedTransactions,
    SIMULATED_DEFAULT_WALLET,
    getNodeDisplayInfo,
} from '@/lib/simulated-transactions';

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

    console.log(`[Expand API] Fetching for ${normalizedAddress} on chain ${chainId}`);

    try {
        // Use Etherscan API for transaction history (free, reliable)
        const { inbound, outbound } = await getAssetTransfersFromExplorer(normalizedAddress, chainId);

        // Fetch prices in parallel
        const allTransfers = [...inbound.transfers, ...outbound.transfers];
        const tokenAddresses = allTransfers
            .filter(t => t.rawContract?.address)
            .map(t => t.rawContract!.address!);

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

        // Fetch metadata for top nodes to improve labels/logos
        const topNodes = ranked.slice(0, 10);
        const metadataMap = new Map<string, string>(); // address -> name

        try {
            // Use public RPC for ENS lookups
            const provider = await callWithFallback(chainId, async (p) => p);
            await Promise.all(
                topNodes.map(async (node) => {
                    // Try ENS reverse lookup (for users and some protocols)
                    try {
                        const ens = await provider.lookupAddress(node.address);
                        if (ens) {
                            metadataMap.set(node.address, ens);
                        }
                    } catch {
                        // Ignore errors (address has no ENS)
                    }
                })
            );
        } catch (error) {
            console.error('[Expand API] Metadata fetch failed:', error);
        }

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

            // Use resolved name if available
            const resolvedName = metadataMap.get(cp.address);
            const label = resolvedName || `${cp.address.slice(0, 6)}...${cp.address.slice(-4)}`;

            return {
                id: cp.address,
                label: label,
                displayName: resolvedName, // Pass pure name for logo lookup
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
        console.warn('Expand API error, falling back to simulated data:', err.message);

        // FALLBACK: Generate simulated data
        const transactions = getSimulatedTransactions();

        // Aggregate simulated transactions relative to the requested address (or default sim wallet)
        const centerId = normalizedAddress;

        // 1. Filter relevant transactions (involving center)
        // Use SIMULATED_DEFAULT_WALLET as alias for requested address to ensure data visibility
        const relevantTxs = transactions.filter(tx =>
            tx.fromId === SIMULATED_DEFAULT_WALLET || tx.toId === SIMULATED_DEFAULT_WALLET
        ).map(tx => ({
            ...tx,
            fromId: tx.fromId === SIMULATED_DEFAULT_WALLET ? centerId : tx.fromId,
            toId: tx.toId === SIMULATED_DEFAULT_WALLET ? centerId : tx.toId,
        }));

        // 2. Aggregate aggregated data
        const nodeMap = new Map<string, any>();
        const linkMap = new Map<string, any>();

        // Ensure center node exists
        nodeMap.set(centerId, {
            id: centerId,
            label: 'You',
            type: 'main',
            value: 0,
            txCount: 0
        });

        relevantTxs.forEach(tx => {
            const otherId = tx.fromId === centerId ? tx.toId : tx.fromId;
            const amount = tx.amountUsd || 0;
            const isInbound = tx.toId === centerId;

            // Update/Create Node
            const existing = nodeMap.get(otherId) || {
                id: otherId,
                label: '',
                type: 'highValue',
                value: 0,
                txCount: 0
            };

            existing.value += amount;
            existing.txCount += 1;

            if (!existing.label) {
                const info = getNodeDisplayInfo(otherId);
                existing.label = info?.displayName || `${otherId.slice(0, 6)}...`;
                if (tx.metadata?.category === 'cex') existing.type = 'exchange';
                else if (tx.metadata?.category === 'defi') existing.type = 'contract';
            }
            nodeMap.set(otherId, existing);

            // Create/Update Link
            const linkId = [centerId, otherId].sort().join('-');
            const existingLink = linkMap.get(linkId);

            if (existingLink) {
                existingLink.value += amount;
                existingLink.txCount += 1;
                if (isInbound && existingLink.direction === 'outbound') existingLink.direction = 'bidirectional';
                if (!isInbound && existingLink.direction === 'inbound') existingLink.direction = 'bidirectional';
            } else {
                linkMap.set(linkId, {
                    id: linkId,
                    source: centerId,
                    target: otherId,
                    value: amount,
                    txCount: 1,
                    direction: isInbound ? 'inbound' : 'outbound'
                });
            }
        });

        const nodes = Array.from(nodeMap.values());
        const links = Array.from(linkMap.values());

        return Response.json({ nodes, links });
    }
}
