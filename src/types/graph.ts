// Node types for visual styling
export type NodeType = 'main' | 'sender' | 'receiver' | 'highValue' | 'exchange' | 'contract';

// Link direction for coloring
export type LinkDirection = 'inbound' | 'outbound' | 'bidirectional';

export interface GraphNode {
  id: string;
  label: string;
  type: NodeType;
  isLoading?: boolean;
  value?: number;      // Total value transferred
  txCount?: number;    // Number of transactions
}

export interface GraphLink {
  id: string;
  source: string;
  target: string;
  value: number;
  txCount: number;
  direction: LinkDirection;
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
