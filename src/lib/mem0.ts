/**
 * Thin client for Mem0 REST API.
 * Env: MEM0_API_KEY (required), MEM0_BASE_URL (optional, default https://api.mem0.ai).
 * Enable Mem0 graph feature for relationship edges.
 */

const DEFAULT_BASE_URL = 'https://api.mem0.ai';

export interface Mem0AddMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface Mem0AddOptions {
  user_id: string;
  messages: Mem0AddMessage[];
  metadata?: Record<string, unknown>;
  enable_graph?: boolean;
  infer?: boolean;
}

export interface Mem0Memory {
  id: string;
  memory: string;
  created_at?: string;
  updated_at?: string;
  metadata?: Record<string, unknown>;
}

export interface Mem0GetAllOptions {
  filters: Record<string, unknown>;
  page?: number;
  page_size?: number;
}

export interface Mem0SearchOptions {
  query: string;
  user_id?: string;
  metadata?: Record<string, unknown>;
  limit?: number;
}

function getBaseUrl(): string {
  return process.env.MEM0_BASE_URL ?? DEFAULT_BASE_URL;
}

function getHeaders(): HeadersInit {
  const key = process.env.MEM0_API_KEY;
  if (!key) throw new Error('MEM0_API_KEY is not set');
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `Token ${key}`,
  };
}

/** Add memories. Use enable_graph: true for entity/relationship edges. */
export async function mem0Add(options: Mem0AddOptions): Promise<{ id: string; memory: string }[]> {
  const base = getBaseUrl();
  const res = await fetch(`${base.replace(/\/$/, '')}/v1/memories/`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      user_id: options.user_id,
      messages: options.messages,
      metadata: options.metadata ?? {},
      enable_graph: options.enable_graph ?? true,
      infer: options.infer ?? true,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Mem0 add failed: ${res.status} ${err}`);
  }
  const data = await res.json();
  const results = Array.isArray(data) ? data : (data as { results?: unknown[] }).results ?? [];
  return (results as { id: string; data?: { memory?: string }; event: string }[]).map((e) => ({
    id: e.id,
    memory: (e.data && e.data.memory) || '',
  }));
}

/** Get all memories with filters (POST /v2/memories). */
export async function mem0GetAll(options: Mem0GetAllOptions): Promise<Mem0Memory[]> {
  const base = getBaseUrl();
  const res = await fetch(`${base.replace(/\/$/, '')}/v2/memories`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      filters: options.filters,
      page: options.page ?? 1,
      page_size: options.page_size ?? 100,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Mem0 get_all failed: ${res.status} ${err}`);
  }
  const data = await res.json();
  const list = Array.isArray(data) ? data : (data as { results?: Mem0Memory[] }).results ?? data;
  return Array.isArray(list) ? list : [];
}

/** Search memories (POST search endpoint). */
export async function mem0Search(options: Mem0SearchOptions): Promise<Mem0Memory[]> {
  const base = getBaseUrl();
  const res = await fetch(`${base.replace(/\/$/, '')}/v1/memories/search`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      query: options.query,
      user_id: options.user_id,
      metadata: options.metadata,
      limit: options.limit ?? 10,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Mem0 search failed: ${res.status} ${err}`);
  }
  const data = await res.json();
  const list = Array.isArray(data) ? data : (data as { results?: Mem0Memory[] }).results ?? data;
  return Array.isArray(list) ? list : [];
}
