// Data source for nodes/links (chain, simulated defi/tradfi/cefi, memory)
export type NodeSource = 'chain' | 'simulated' | 'memory';

// Node types for visual styling
export type NodeType = 'main' | 'sender' | 'receiver' | 'highValue' | 'exchange' | 'contract';

// Link direction for coloring
export type LinkDirection = 'inbound' | 'outbound' | 'bidirectional';

export type NodeCategory = 'defi' | 'tradfi' | 'cex' | 'p2p';

export interface GraphNode {
  id: string;
  label: string;
  type: NodeType;
  isLoading?: boolean;
  value?: number;      // Total value transferred
  txCount?: number;    // Number of transactions
  source?: NodeSource;
  memoryId?: string;  // Mem0 id when node is a memory
  summary?: string;   // Memory text or tx summary
  category?: NodeCategory;
  displayName?: string; // Friendly name (e.g. "Amazon", "Uniswap V2")
}

export interface GraphLink {
  id: string;
  source: string;
  target: string;
  value: number;
  txCount: number;
  direction: LinkDirection;
  sourceType?: NodeSource;
  metadata?: Record<string, unknown>;
  /** Most recent activity (ISO date string) */
  lastActive?: string;
  /** e.g. "DeFi", "TradFi", "CEX", "P2P" */
  relationshipType?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

// Visual constants
export const NODE_COLORS: Record<NodeType, string> = {
  main: '#a855f7',      // Electric Purple
  sender: '#22d3ee',    // Cyan
  receiver: '#f43f5e',  // Coral Red
  highValue: '#fbbf24', // Gold
  exchange: '#6366f1',  // Indigo
  contract: '#8b5cf6',  // Violet
};

export const LINK_COLORS: Record<LinkDirection, string> = {
  inbound: '#10b981',    // Emerald Green
  outbound: '#f43f5e',   // Coral Red
  bidirectional: '#a855f7', // Purple
};

export const NODE_EMOJIS: Record<NodeType, string> = {
  main: '🔮',
  sender: '💸',
  receiver: '📥',
  highValue: '💎',
  exchange: '🏦',
  contract: '📜',
};
