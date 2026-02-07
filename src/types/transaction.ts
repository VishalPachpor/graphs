import type { NodeSource } from './graph';

/** Normalized transaction shape (chain + simulated defi/tradfi/cefi) */
export interface NormalizedTransaction {
  id: string;
  source: NodeSource;
  fromId: string;
  toId: string;
  amountUsd?: number;
  amountRaw?: number;
  currency?: string;
  date: string;
  metadata?: Record<string, unknown>;
}
