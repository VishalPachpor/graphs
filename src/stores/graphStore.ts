import { create } from 'zustand';
import { GraphData, GraphNode, GraphLink } from '@/types/graph';
import type { NodeCategory } from '@/types/graph';

export type GraphMode = 'transaction' | 'memory';
export type TimeRange = '7d' | '30d' | '90d' | 'all';

const ALL_CATEGORIES: NodeCategory[] = ['defi', 'tradfi', 'cex', 'p2p'];

interface GraphStore {
    graph: GraphData;
    graphMode: GraphMode;
    expandedNodes: Set<string>;
    pendingNodes: Set<string>;
    selectedNode: GraphNode | null;
    /** Categories to show; empty = all */
    filterCategories: NodeCategory[];
    searchQuery: string;
    timeRange: TimeRange;

    initGraph: (rootAddress: string) => void;
    setGraphMode: (mode: GraphMode) => void;
    setTimeRange: (range: TimeRange) => void;
    loadFullGraph: () => Promise<void>;
    expandNode: (address: string, chainId?: number) => Promise<void>;
    selectNode: (node: GraphNode | null) => void;
    setFilterCategories: (categories: NodeCategory[]) => void;
    setSearchQuery: (q: string) => void;
}

export const useGraphStore = create<GraphStore>((set, get) => ({
    graph: { nodes: [], links: [] },
    graphMode: 'transaction',
    expandedNodes: new Set(),
    pendingNodes: new Set(),
    selectedNode: null,
    filterCategories: ALL_CATEGORIES,
    searchQuery: '',
    timeRange: 'all',

    setGraphMode: (mode) => set({ graphMode: mode }),
    setTimeRange: (range) => set({ timeRange: range }),
    setFilterCategories: (categories) => set({ filterCategories: categories.length ? categories : ALL_CATEGORIES }),
    setSearchQuery: (q) => set({ searchQuery: (q || '').trim() }),

    initGraph: (address) => {
        const normalizedAddress = address.toLowerCase();
        set({
            graph: {
                nodes: [
                    {
                        id: normalizedAddress,
                        label: `${normalizedAddress.slice(0, 6)}...${normalizedAddress.slice(-4)}`,
                        type: 'main',
                    },
                ],
                links: [],
            },
            expandedNodes: new Set(),
            pendingNodes: new Set(),
            selectedNode: null,
        });
    },

    loadFullGraph: async () => {
        const { graphMode, timeRange } = get();
        const base = graphMode === 'memory' ? '/api/graph/memories' : '/api/graph';
        const params = timeRange !== 'all' && graphMode === 'transaction' ? `?range=${timeRange}` : graphMode === 'memory' && timeRange !== 'all' ? `?range=${timeRange}` : '';
        const url = base + params;
        try {
            const res = await fetch(url);
            const data = await res.json();
            if (!res.ok || !data.nodes || !data.links) {
                console.error('Failed to load graph:', data.error || data);
                return;
            }
            set({
                graph: data as GraphData,
                expandedNodes: new Set(),
                pendingNodes: new Set(),
                selectedNode: null,
            });
        } catch (error) {
            console.error('Failed to load full graph:', error);
        }
    },

    expandNode: async (address, chainId = 1) => {
        const { expandedNodes, pendingNodes, graph } = get();
        const normalizedAddress = address.toLowerCase();

        // Guard: already expanded or in-flight
        if (expandedNodes.has(normalizedAddress) || pendingNodes.has(normalizedAddress)) {
            return;
        }

        // Mark as pending
        set((state) => ({
            pendingNodes: new Set(state.pendingNodes).add(normalizedAddress),
            graph: {
                ...state.graph,
                nodes: state.graph.nodes.map((n) =>
                    n.id === normalizedAddress ? { ...n, isLoading: true } : n
                ),
            },
        }));

        try {
            const res = await fetch(`/api/expand?address=${normalizedAddress}&chainId=${chainId}`);
            const data = await res.json();
            console.log('[graphStore] expandNode response:', data);

            // The original condition was `!res.ok || !newData.nodes || !newData.links`
            // The instruction provided `if (data.nodes && data.links)` which is the opposite.
            // To maintain the original logic and incorporate the log, we'll use `data` for the check.
            if (!res.ok || !data.nodes || !data.links) {
                console.error('Expansion failed:', data.error || 'Invalid data');
                set((state) => ({
                    graph: {
                        ...state.graph,
                        nodes: state.graph.nodes.map((n) =>
                            n.id === normalizedAddress ? { ...n, isLoading: false } : n
                        ),
                    },
                    pendingNodes: new Set(
                        [...state.pendingNodes].filter((a) => a !== normalizedAddress)
                    ),
                }));
                return;
            }

            // Merge logic with bidirectional link deduplication
            const nodeMap = new Map<string, GraphNode>(
                graph.nodes.map((n) => [n.id, n])
            );
            (data as GraphData).nodes.forEach((n) => {
                if (!nodeMap.has(n.id)) {
                    nodeMap.set(n.id, n);
                }
            });

            const linkMap = new Map<string, GraphLink>(
                graph.links.map((l) => [l.id, l])
            );
            (data as GraphData).links.forEach((l) => {
                const key = [l.source, l.target].sort().join('-');
                const existing = linkMap.get(key);
                if (existing) {
                    existing.value += l.value;
                    existing.txCount += l.txCount;
                } else {
                    linkMap.set(key, { ...l, id: key });
                }
            });

            set((state) => ({
                graph: {
                    nodes: Array.from(nodeMap.values()).map((n) =>
                        n.id === normalizedAddress ? { ...n, isLoading: false, isExpanded: true } : n
                    ),
                    links: Array.from(linkMap.values()),
                },
                expandedNodes: new Set(state.expandedNodes).add(normalizedAddress),
                pendingNodes: new Set(
                    [...state.pendingNodes].filter((a) => a !== normalizedAddress)
                ),
            }));
        } catch (error) {
            console.error('Failed to expand node:', error);
            set((state) => ({
                pendingNodes: new Set(
                    [...state.pendingNodes].filter((a) => a !== normalizedAddress)
                ),
                graph: {
                    ...state.graph,
                    nodes: state.graph.nodes.map((n) =>
                        n.id === normalizedAddress ? { ...n, isLoading: false } : n
                    ),
                },
            }));
        }
    },

    selectNode: (node) => set({ selectedNode: node }),
}));

/** Client-side filtered graph by category and search */
export function useFilteredGraph(): GraphData {
    const graph = useGraphStore((s) => s.graph);
    const filterCategories = useGraphStore((s) => s.filterCategories);
    const searchQuery = useGraphStore((s) => s.searchQuery);
    const categorySet = new Set(filterCategories.length ? filterCategories : ALL_CATEGORIES);
    const q = searchQuery.toLowerCase();
    const nodes = graph.nodes.filter((n) => {
        const cat = n.category || 'p2p';
        if (!categorySet.has(cat)) return false;
        if (!q) return true;
        const text = `${n.label} ${n.id} ${n.displayName || ''}`.toLowerCase();
        return text.includes(q);
    });
    const visibleIds = new Set(nodes.map((n) => n.id));
    const links = graph.links.filter((l) => visibleIds.has(l.source) && visibleIds.has(l.target));
    return { nodes, links };
}
