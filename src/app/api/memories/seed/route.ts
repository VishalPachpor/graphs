import { NextResponse } from 'next/server';
import { mem0Add } from '@/lib/mem0';
import { getSimulatedTransactions, SIMULATED_DEFAULT_WALLET } from '@/lib/simulated-transactions';

const USER_ID = SIMULATED_DEFAULT_WALLET;
const BATCH_SIZE = 25;

function memoryText(tx: {
  fromId: string;
  toId: string;
  amountUsd?: number;
  date: string;
  metadata?: Record<string, unknown>;
}): string {
  const from = tx.fromId.length > 20 ? `${tx.fromId.slice(0, 8)}...${tx.fromId.slice(-6)}` : tx.fromId;
  const to = tx.toId.length > 20 ? `${tx.toId.slice(0, 8)}...${tx.toId.slice(-6)}` : tx.toId;
  const amt = tx.amountUsd != null ? ` $${tx.amountUsd.toFixed(2)}` : '';
  const meta = tx.metadata as { category?: string; action?: string; protocol?: string; counterparty?: string; exchange?: string } | undefined;
  const action = meta?.action || meta?.category || 'transfer';
  return `Financial ${action} on ${tx.date}: ${from} → ${to}${amt} (simulated).`;
}

/** POST: seed Mem0 with memories from simulated DeFi/TradFi/CEX/P2P transactions. */
export async function POST() {
  if (!process.env.MEM0_API_KEY) {
    return NextResponse.json({ error: 'MEM0_API_KEY is not set' }, { status: 503 });
  }
  const transactions = getSimulatedTransactions();
  let added = 0;
  for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
    const batch = transactions.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map((tx) =>
        mem0Add({
          user_id: USER_ID,
          messages: [{ role: 'user', content: memoryText(tx) }],
          metadata: {
            source: 'simulated',
            transactionId: tx.id,
            fromId: tx.fromId,
            toId: tx.toId,
            amountUsd: tx.amountUsd,
            date: tx.date,
            ...tx.metadata,
          },
          enable_graph: true,
          infer: false,
        })
      )
    );
    added += batch.length;
  }
  return NextResponse.json({ ok: true, added, total: transactions.length });
}
