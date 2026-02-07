'use client';

import { useGraphStore } from '@/stores/graphStore';

export function GraphLegend() {
  const graphMode = useGraphStore((s) => s.graphMode);
  const items = [
    { label: 'DeFi', color: '#22d3ee', desc: 'Protocols' },
    { label: 'TradFi', color: '#fbbf24', desc: 'Banks, merchants' },
    { label: 'CEX', color: '#6366f1', desc: 'Exchanges' },
    { label: 'P2P', color: '#94a3b8', desc: 'Wallets' },
  ];
  return (
    <div className="absolute bottom-4 left-4 z-20 rounded-xl bg-slate-900/90 backdrop-blur border border-slate-700/80 px-4 py-3 shadow-xl">
      <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Node types</p>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {items.map(({ label, color, desc }) => (
          <div key={label} className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full shrink-0 border-2 border-white/20"
              style={{ backgroundColor: color }}
            />
            <span className="text-slate-300 text-sm font-medium">{label}</span>
            <span className="text-slate-500 text-xs hidden sm:inline">{desc}</span>
          </div>
        ))}
      </div>
      <p className="text-slate-500 text-xs mt-2 pt-2 border-t border-slate-700/50">
        Links: green = in, red = out
      </p>
      {graphMode === 'memory' && (
        <p className="text-violet-400/90 text-xs mt-2">
          Memory graph: entities from Mem0 (curated, not every memory)
        </p>
      )}
    </div>
  );
}
