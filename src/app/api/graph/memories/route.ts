import { NextResponse } from 'next/server';
import { mem0GetAll } from '@/lib/mem0';
import {
  SIMULATED_DEFAULT_WALLET,
  getNodeDisplayInfo,
} from '@/lib/simulated-transactions';
import type { GraphData, GraphNode, GraphLink } from '@/types/graph';

const MAIN_ID = SIMULATED_DEFAULT_WALLET;
const MAX_NODES = 45; // Curated: main + top 44 entities by volume

function nodeType(id: string, meta?: Record<string, unknown>): GraphNode['type'] {
  if (id === MAIN_ID) return 'main';
  const cat = (meta?.category as string) || '';
  if (cat === 'cex') return 'exchange';
  if (cat === 'defi') return 'contract';
  return 'receiver';
}

/** GET: memory graph — entities aggregated from Mem0 memories. Query: range=7d|30d|90d|all (default all). */
export async function GET(request: Request) {
  if (!process.env.MEM0_API_KEY) {
    return NextResponse.json(
      { error: 'MEM0_API_KEY is not set' },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const rangeParam = searchParams.get('range') || 'all';

  let memories: { metadata?: Record<string, unknown> }[] = [];
  try {
    memories = await mem0GetAll({
      filters: { user_id: MAIN_ID },
      page_size: 500,
    });
  } catch (e) {
    console.error('Mem0 get_all failed:', e);
    const mainNode: GraphNode = {
      id: MAIN_ID,
      label: 'Your wallet',
      type: 'main',
      source: 'memory',
      category: 'p2p',
      displayName: `${MAIN_ID.slice(0, 6)}…${MAIN_ID.slice(-4)}`,
    };
    return NextResponse.json({ nodes: [mainNode], links: [] });
  }

  if (rangeParam !== 'all') {
    const end = new Date();
    const start = new Date();
    if (rangeParam === '7d') start.setDate(end.getDate() - 7);
    else if (rangeParam === '30d') start.setDate(end.getDate() - 30);
    else if (rangeParam === '90d') start.setDate(end.getDate() - 90);
    const fromTs = start.getTime();
    const toTs = end.getTime();
    memories = memories.filter((m) => {
      const d = (m.metadata?.date as string) || (m.metadata?.created_at as string) || '';
      const t = d ? new Date(d).getTime() : 0;
      return t >= fromTs && t <= toTs;
    });
  }

  const nodeMap = new Map<string, GraphNode>();
  const linkAgg = new Map<string, { value: number; txCount: number; inVal: number; outVal: number; lastDate: string; category: string }>();
  const nodeTotalValue = new Map<string, number>();

  nodeMap.set(MAIN_ID, {
    id: MAIN_ID,
    label: 'Your wallet',
    type: 'main',
    source: 'memory',
    category: 'p2p',
    displayName: `${MAIN_ID.slice(0, 6)}…${MAIN_ID.slice(-4)}`,
  });
  nodeTotalValue.set(MAIN_ID, Infinity);

  for (const mem of memories) {
    const meta = (mem.metadata || {}) as Record<string, unknown>;
    const fromId = String(meta.fromId ?? '').toLowerCase();
    const toId = String(meta.toId ?? '').toLowerCase();
    const amount = Number(meta.amountUsd ?? 0);
    if (!fromId || !toId) continue;

    if (!nodeMap.has(fromId)) {
      const info = getNodeDisplayInfo(fromId);
      nodeMap.set(fromId, {
        id: fromId,
        label: info?.displayName ?? fromId.slice(0, 8) + '…',
        type: nodeType(fromId, meta),
        source: 'memory',
        summary: (meta.action as string) || (meta.category as string),
        category: info?.category ?? 'p2p',
        displayName: info?.displayName,
      });
    }
    if (!nodeMap.has(toId)) {
      const info = getNodeDisplayInfo(toId);
      nodeMap.set(toId, {
        id: toId,
        label: info?.displayName ?? toId.slice(0, 8) + '…',
        type: nodeType(toId, meta),
        source: 'memory',
        summary: (meta.action as string) || (meta.category as string),
        category: info?.category ?? 'p2p',
        displayName: info?.displayName,
      });
    }
    nodeTotalValue.set(fromId, (nodeTotalValue.get(fromId) ?? 0) + amount);
    nodeTotalValue.set(toId, (nodeTotalValue.get(toId) ?? 0) + amount);

    const key = [fromId, toId].sort().join('::');
    const prev = linkAgg.get(key) ?? { value: 0, txCount: 0, inVal: 0, outVal: 0, lastDate: '', category: '' };
    prev.value += amount;
    prev.txCount += 1;
    if (fromId === MAIN_ID) prev.outVal += amount;
    else if (toId === MAIN_ID) prev.inVal += amount;
    const memDate = String(meta.date ?? meta.created_at ?? '').slice(0, 10);
    if (memDate && (!prev.lastDate || memDate > prev.lastDate)) prev.lastDate = memDate;
    const cat = String(meta.category ?? '').toLowerCase() || 'p2p';
    if (cat) prev.category = cat;
    linkAgg.set(key, prev);
  }

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
      sourceType: 'memory',
      lastActive: agg.lastDate || undefined,
      relationshipType,
    });
  }

  const nodes = Array.from(nodeMap.values()).filter((n) => keepSet.has(n.id));
  const graph: GraphData = { nodes, links };
  return NextResponse.json(graph);
}
