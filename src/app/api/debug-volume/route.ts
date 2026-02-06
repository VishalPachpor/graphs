import { alchemy } from '@/lib/alchemy';
import { AssetTransfersCategory } from 'alchemy-sdk';
import { NextRequest } from 'next/server';
import {
    getEthPrice,
    getTokenPrices,
    calculateUsdValue,
    extractTokenAddresses
} from '@/lib/price-service';

export async function GET(req: NextRequest) {
    const address = req.nextUrl.searchParams.get('address') || '0x1226c3a694b7e5b7950bfac9b71524acd7b786fe';
    const normalizedAddress = address.toLowerCase();

    try {
        const currentBlock = await alchemy.core.getBlockNumber();
        const fromBlock = Math.max(0, currentBlock - 100000); // Last ~100k blocks just for check, or use larger range

        // Fetch transfers
        const results = await Promise.all([
            alchemy.core.getAssetTransfers({
                fromBlock: "0x0", // Check all history for this debug
                toAddress: normalizedAddress,
                category: [AssetTransfersCategory.EXTERNAL, AssetTransfersCategory.ERC20],
                maxCount: 100, // Check top 100
                order: 'desc' as any // Force cast
            }),
            alchemy.core.getAssetTransfers({
                fromBlock: "0x0",
                fromAddress: normalizedAddress,
                category: [AssetTransfersCategory.EXTERNAL, AssetTransfersCategory.ERC20],
                maxCount: 100,
                order: 'desc' as any
            }),
        ]);

        const [inbound, outbound] = results;

        const allTransfers = [...inbound.transfers, ...outbound.transfers];
        const tokenAddresses = extractTokenAddresses(allTransfers);

        const [ethPrice, tokenPrices] = await Promise.all([
            getEthPrice(),
            getTokenPrices(tokenAddresses),
        ]);

        const report = allTransfers.map(tx => {
            const rawValue = parseFloat(tx.value?.toString() || '0');
            const tokenAddress = tx.rawContract?.address?.toLowerCase() || null;
            const asset = tx.asset || 'ETH';

            const usdValue = calculateUsdValue(rawValue, asset, tokenAddress, ethPrice, tokenPrices);

            return {
                hash: tx.hash,
                asset,
                tokenAddress,
                rawValue,
                usdValue,
                priceUsed: tokenAddress ? tokenPrices.get(tokenAddress)?.price : ethPrice,
                direction: tx.to?.toLowerCase() === normalizedAddress ? 'IN' : 'OUT',
                counterparty: tx.to?.toLowerCase() === normalizedAddress ? tx.from : tx.to
            };
        }).sort((a, b) => b.usdValue - a.usdValue); // Sort by highest USD value

        // Filter for suspicious high values or just return top 20
        const topVolume = report.slice(0, 50);

        return Response.json({
            target: normalizedAddress,
            ethPrice,
            totalTransfersAnalyzed: allTransfers.length,
            topVolumeTransactions: topVolume
        }, { status: 200 });

    } catch (error) {
        return Response.json({ error: (error as Error).message }, { status: 500 });
    }
}
