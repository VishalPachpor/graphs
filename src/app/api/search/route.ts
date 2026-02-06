import { alchemy } from '@/lib/alchemy';
import { isValidAddress } from '@/lib/utils';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
    const query = req.nextUrl.searchParams.get('q');

    if (!query) {
        return Response.json({ error: 'Query required' }, { status: 400 });
    }

    try {
        // Check if it's a valid address
        if (isValidAddress(query)) {
            return Response.json({ address: query.toLowerCase() });
        }

        // Try ENS resolution
        const resolved = await alchemy.core.resolveName(query);
        if (resolved) {
            return Response.json({
                address: resolved.toLowerCase(),
                ens: query,
            });
        }

        return Response.json(
            { error: 'Invalid address or ENS name' },
            { status: 400 }
        );
    } catch (error) {
        console.error('Search API error:', error);
        return Response.json({ error: 'Search failed' }, { status: 500 });
    }
}
