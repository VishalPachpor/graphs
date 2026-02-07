'use client';

import { useState } from 'react';
import { useGraphStore } from '@/stores/graphStore';
import type { GraphMode, TimeRange } from '@/stores/graphStore';
import type { NodeCategory } from '@/types/graph';

const CATEGORIES: { id: NodeCategory; label: string }[] = [
    { id: 'defi', label: 'DeFi' },
    { id: 'tradfi', label: 'TradFi' },
    { id: 'cex', label: 'CEX' },
    { id: 'p2p', label: 'P2P' },
];

export function AppControls() {
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);
  const graphMode = useGraphStore((s) => s.graphMode);
  const setGraphMode = useGraphStore((s) => s.setGraphMode);
  const loadFullGraph = useGraphStore((s) => s.loadFullGraph);
  const filterCategories = useGraphStore((s) => s.filterCategories);
  const setFilterCategories = useGraphStore((s) => s.setFilterCategories);
  const searchQuery = useGraphStore((s) => s.searchQuery);
  const setSearchQuery = useGraphStore((s) => s.setSearchQuery);
  const timeRange = useGraphStore((s) => s.timeRange);
  const setTimeRange = useGraphStore((s) => s.setTimeRange);

  const handleSeedMem0 = async () => {
    setSeeding(true);
    setSeedResult(null);
    try {
      const res = await fetch('/api/memories/seed', { method: 'POST' });
      const data = await res.json();
      if (res.ok) setSeedResult(`Seeded ${data.added} memories to Mem0`);
      else setSeedResult(`Error: ${data.error || res.statusText}`);
    } catch (e) {
      setSeedResult(`Error: ${e instanceof Error ? e.message : 'Failed'}`);
    } finally {
      setSeeding(false);
    }
  };

  const handleRefreshGraph = () => {
    loadFullGraph();
  };

  const handleMode = (mode: GraphMode) => {
    setGraphMode(mode);
    loadFullGraph();
  };

  const toggleCategory = (cat: NodeCategory) => {
    const set = new Set(filterCategories);
    if (set.has(cat)) {
      set.delete(cat);
      if (set.size === 0) return; // keep at least one
    } else set.add(cat);
    setFilterCategories(Array.from(set));
  };

  const showAll = filterCategories.length >= 4;

  return (
    <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 max-w-md">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-gray-500 text-xs font-medium uppercase tracking-wide mr-1">Graph</span>
        <button
          type="button"
          onClick={() => handleMode('transaction')}
          className={`px-3 py-2 rounded-lg text-sm font-medium border ${
            graphMode === 'transaction'
              ? 'bg-slate-600 text-white border-slate-500'
              : 'bg-gray-800/90 text-gray-400 border-gray-600 hover:bg-gray-700'
          }`}
        >
          Transaction
        </button>
        <button
          type="button"
          onClick={() => handleMode('memory')}
          className={`px-3 py-2 rounded-lg text-sm font-medium border ${
            graphMode === 'memory'
              ? 'bg-violet-600/90 text-white border-violet-500'
              : 'bg-gray-800/90 text-gray-400 border-gray-600 hover:bg-gray-700'
          }`}
        >
          Memory
        </button>
        <button
          type="button"
          onClick={handleRefreshGraph}
          className="px-3 py-2 rounded-lg bg-gray-800/90 text-white text-sm font-medium border border-gray-600 hover:bg-gray-700"
        >
          Refresh
        </button>
        <button
          type="button"
          onClick={handleSeedMem0}
          disabled={seeding}
          className="px-3 py-2 rounded-lg bg-violet-600/90 text-white text-sm font-medium border border-violet-500 hover:bg-violet-500 disabled:opacity-50"
        >
          {seeding ? 'Seeding…' : 'Seed Mem0'}
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-gray-700/50">
        <span className="text-gray-500 text-xs font-medium uppercase tracking-wide mr-1">Time</span>
        {(['7d', '30d', '90d', 'all'] as TimeRange[]).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => {
              setTimeRange(r);
              loadFullGraph();
            }}
            className={`px-2 py-1 rounded text-xs font-medium ${
              timeRange === r ? 'bg-slate-600 text-white' : 'bg-gray-800/90 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {r === 'all' ? 'All' : r}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-gray-500 text-xs font-medium uppercase tracking-wide mr-1">Show</span>
        {CATEGORIES.map(({ id, label }) => (
          <label key={id} className="flex items-center gap-1.5 text-sm text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={filterCategories.includes(id)}
              onChange={() => toggleCategory(id)}
              className="rounded border-gray-500 bg-gray-800 text-indigo-500"
            />
            {label}
          </label>
        ))}
        {!showAll && (
          <button
            type="button"
            onClick={() => setFilterCategories(['defi', 'tradfi', 'cex', 'p2p'])}
            className="text-xs text-gray-500 hover:text-gray-400"
          >
            All
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <label className="text-gray-500 text-xs font-medium uppercase tracking-wide">Search</label>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Label or address…"
          className="flex-1 min-w-0 px-2 py-1.5 rounded bg-gray-800 border border-gray-600 text-sm text-white placeholder-gray-500"
        />
      </div>
      {seedResult && (
        <p className="text-xs text-gray-400 max-w-xs bg-gray-900/80 px-2 py-1 rounded">
          {seedResult}
        </p>
      )}
    </div>
  );
}
