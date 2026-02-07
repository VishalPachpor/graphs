import { NextResponse } from 'next/server';
import { getSimulatedTransactions } from '@/lib/simulated-transactions';

/** GET: return all simulated transactions (DeFi, TradFi, CEX, P2P) for graph/sync. */
export async function GET() {
  const transactions = getSimulatedTransactions();
  return NextResponse.json({ transactions });
}
