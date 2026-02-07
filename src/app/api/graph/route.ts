import { NextResponse } from 'next/server';
import {
  getSimulatedTransactions,
  SIMULATED_DEFAULT_WALLET,
  getNodeDisplayInfo,
} from '@/lib/simulated-transactions';
import type { GraphData, GraphNode, GraphLink } from '@/types/graph';

const MAIN_ID = SIMULATED_DEFAULT_WALLET;
const MAX_NODES = 65; // Keep graph readable: main + top 64 by volume

function nodeType(id: string, meta?: Record<string, unknown>): GraphNode['type'] {
  if (id === MAIN_ID) return 'main';
  const cat = (meta?.category as string) || '';
  if (cat === 'cex') return 'exchange';
  if (cat === 'defi') return 'contract';
  return 'receiver';
}

/** GET: unified graph from simulated transactions. Query: range=7d|30d|90d|all (default all), or from=&to= (YYYY-MM-DD). */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rangeParam = searchParams.get('range') || 'all';
  const from = searchParams.get('from') || '';
  const to = searchParams.get('to') || '';

  let range: { fromDate?: string; toDate?: string } | undefined;
  if (from || to) {
    range = {};
    if (from) range.fromDate = from;
    if (to) range.toDate = to;
  } else if (rangeParam !== 'all') {
    const end = new Date();
    const start = new Date();
    if (rangeParam === '7d') start.setDate(end.getDate() - 7);
    else if (rangeParam === '30d') start.setDate(end.getDate() - 30);
    else if (rangeParam === '90d') start.setDate(end.getDate() - 90);
    range = {
      fromDate: start.toISOString().slice(0, 10),
      toDate: end.toISOString().slice(0, 10),
    };
  }

  const transactions = getSimulatedTransactions(range);
  const nodeMap = new Map<string, GraphNode>();
  const linkAgg = new Map<string, { value: number; txCount: number; inVal: number; outVal: number; lastDate: string; category: string }>();
  const nodeTotalValue = new Map<string, number>();

  nodeMap.set(MAIN_ID, {
    id: MAIN_ID,
    label: 'Your wallet',
    type: 'main',
    source: 'simulated',
    category: 'p2p',
    displayName: `${MAIN_ID.slice(0, 6)}…${MAIN_ID.slice(-4)}`,
  });
  nodeTotalValue.set(MAIN_ID, Infinity); // always keep main

  for (const tx of transactions) {
    const from = tx.fromId.toLowerCase();
    const to = tx.toId.toLowerCase();
    const amount = tx.amountUsd ?? 0;

    if (!nodeMap.has(from)) {
      const info = getNodeDisplayInfo(tx.fromId);
      nodeMap.set(from, {
        id: from,
        label: info?.displayName ?? from.slice(0, 8) + '…',
        type: nodeType(from, tx.metadata),
        source: 'simulated',
        summary: (tx.metadata?.action as string) || (tx.metadata?.category as string),
        category: info?.category ?? 'p2p',
        displayName: info?.displayName,
      });
    }
    if (!nodeMap.has(to)) {
      const info = getNodeDisplayInfo(tx.toId);
      nodeMap.set(to, {
        id: to,
        label: info?.displayName ?? to.slice(0, 8) + '…',
        type: nodeType(to, tx.metadata),
        source: 'simulated',
        summary: (tx.metadata?.action as string) || (tx.metadata?.category as string),
        category: info?.category ?? 'p2p',
        displayName: info?.displayName,
      });
    }
    nodeTotalValue.set(from, (nodeTotalValue.get(from) ?? 0) + amount);
    nodeTotalValue.set(to, (nodeTotalValue.get(to) ?? 0) + amount);

    const key = [from, to].sort().join('::');
    const prev = linkAgg.get(key) ?? { value: 0, txCount: 0, inVal: 0, outVal: 0, lastDate: '', category: '' };
    prev.value += amount;
    prev.txCount += 1;
    if (from === MAIN_ID) prev.outVal += amount;
    else if (to === MAIN_ID) prev.inVal += amount;
    const txDate = (tx.date as string) || '';
    if (txDate && (!prev.lastDate || txDate > prev.lastDate)) prev.lastDate = txDate;
    const cat = (tx.metadata?.category as string) || 'p2p';
    if (cat) prev.category = cat;
    linkAgg.set(key, prev);
  }

  // Keep only main + top MAX_NODES-1 by total incident value
  const sortedIds = [...nodeTotalValue.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_NODES)
    .map(([id]) => id);
  const keepSet = new Set(sortedIds);

  const links: GraphLink[] = [];
  for (const [key, agg] of linkAgg) {
    const [source, target] = key.split('::');
    if (!keepSet.has(source) || !keepSet.has(target)) continue;
    let direction: GraphLink['direction'] = 'bidirectional';
    if (agg.inVal > 0 && agg.outVal > 0) direction = 'bidirectional';
    else if (source === MAIN_ID) direction = agg.outVal > 0 ? 'outbound' : 'inbound';
    else direction = agg.inVal > 0 ? 'inbound' : 'outbound';
    const relationshipType = agg.category === 'defi' ? 'DeFi' : agg.category === 'tradfi' ? 'TradFi' : agg.category === 'cex' ? 'CEX' : 'P2P';
    links.push({
      id: key.replace(/::/g, '-'),
      source,
      target,
      value: agg.value,
      txCount: agg.txCount,
      direction,
      sourceType: 'simulated',
      lastActive: agg.lastDate || undefined,
      relationshipType,
    });
  }

  const nodes = Array.from(nodeMap.values()).filter((n) => keepSet.has(n.id));
  const graph: GraphData = { nodes, links };
  return NextResponse.json(graph);
}
