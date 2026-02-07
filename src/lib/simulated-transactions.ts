import type { NormalizedTransaction } from '@/types/transaction';

const DEFAULT_WALLET = '0xb29b9fd58cdb2e3bb068bc8560d8c13b2454684d';

/** Simulated counterparties: DeFi, TradFi, CEX, and wallets */
const DEFI_PROTOCOLS = [
  { id: '0x7a250d5630b4cf539739df2c5dacb4c659f2488d', name: 'Uniswap V2 Router' },
  { id: '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45', name: 'Uniswap V3 Router' },
  { id: '0x87870bca3f3fd6335c3f4ce83959d6d6e24b7ae', name: 'Aave V3 Pool' },
  { id: '0xc3d688b66703497daa19211eedff47f25384cdc3', name: 'Compound cUSDCv3' },
  { id: '0xdef1c0ded9bec7f1a1670819833240f027b25eff', name: '0x Exchange' },
  { id: '0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f', name: 'SushiSwap Router' },
  { id: '0x1111111254eeb25477b68fb85ed929f73a960582', name: '1inch Aggregator' },
  { id: '0xba12222222228d8ba445958a75a0704d566bf2c8', name: 'Balancer Vault' },
  { id: '0xe592427a0aece92de3edee1f18e0157c05861564', name: 'Uniswap V3' },
  { id: '0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad', name: 'Uniswap Universal Router' },
];

const TRADFI_COUNTERPARTIES = [
  { id: 'tradfi:employer:acme', name: 'ACME Corp (Salary)' },
  { id: 'tradfi:landlord:rent', name: 'Rent Payment' },
  { id: 'tradfi:utility:electric', name: 'Electric Co' },
  { id: 'tradfi:utility:internet', name: 'Internet Provider' },
  { id: 'tradfi:merchant:amazon', name: 'Amazon' },
  { id: 'tradfi:merchant:groceries', name: 'Supermarket' },
  { id: 'tradfi:merchant:gas', name: 'Gas Station' },
  { id: 'tradfi:bank:checking', name: 'Checking Account' },
  { id: 'tradfi:bank:savings', name: 'Savings Account' },
  { id: 'tradfi:insurance:health', name: 'Health Insurance' },
  { id: 'tradfi:subscription:netflix', name: 'Netflix' },
  { id: 'tradfi:subscription:spotify', name: 'Spotify' },
  { id: 'tradfi:payment:venmo', name: 'Venmo' },
  { id: 'tradfi:payment:paypal', name: 'PayPal' },
  { id: 'tradfi:investment:broker', name: 'Brokerage Account' },
];

const CEX_ADDRESSES = [
  { id: '0x28c6c06298d514db089934071355e5743bf21d60', name: 'Binance' },
  { id: '0x21a31ee1afc51d94c2efccaa2092ad1028285549', name: 'Binance 2' },
  { id: '0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be', name: 'Binance Hot' },
  { id: '0x56eddb7aa87536c09ccc2793473599fd21a8b17f', name: 'Coinbase' },
  { id: '0x71660c4005ba85c37ccec55d0c4493e66fe775d3', name: 'Coinbase 2' },
  { id: '0x503828976d22510aad0201ac7ec88293211d23da', name: 'Kraken' },
  { id: '0xd551234ae421e3bcba99a0da6d736074f22192ff', name: 'Kraken 2' },
  { id: '0x267be1c1d684f78cb4f6a176c4911b741b4fc846', name: 'Kraken 3' },
  { id: '0x1522900b6dafac587d499a862861c0869be6e428', name: 'OKX' },
  { id: '0x6cc5f688a315f3dc28a7781717a9a798a59ffda', name: 'OKX 2' },
];

/** Random-looking wallet addresses for P2P / transfers */
const P2P_WALLETS = [
  '0x742d35cc6634c0532925a3b844bc454e4438f44e',
  '0x5a0b54d5dc17e0aadc383d2db43b0a0d3e029c4',
  '0x8ba1f109551bd432803012645ac136ddd64dba72',
  '0xab7c74abc0c4d48d1bdad5dcb26153fc8780f83e',
  '0xdc76cd25977e0a5ae17155770273ad58648900d3',
  '0xfb3bd022d5dacf95e28e6df9c21395317d7da8cb',
  '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
  '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  '0xdac17f958d2ee523a2206206994597c13d831ec7',
  '0x6b175474e89094c44da98b954eedeac495271d0f',
  '0x95ad61b0a150d79219dc64f5e6a8e8b0e93a0e6a',
  '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9',
  '0x514910771af9ca656af840dff83e8264ecf986ca',
  '0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2',
];

const DEFI_ACTIONS = [
  'Swap',
  'Add liquidity',
  'Remove liquidity',
  'Supply',
  'Borrow',
  'Repay',
  'Stake',
  'Unstake',
  'Claim rewards',
  'Flash loan',
];

const TRADFI_ACTIONS = [
  'Salary deposit',
  'Rent payment',
  'Utility bill',
  'Purchase',
  'Transfer',
  'Subscription',
  'Refund',
  'Dividend',
  'Interest',
  'Insurance premium',
];

const CEX_ACTIONS = ['Deposit', 'Withdrawal', 'Trade', 'Fee', 'Staking reward', 'Airdrop'];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomAmount(min: number, max: number): number {
  return Math.round((min + Math.random() * (max - min)) * 100) / 100;
}

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export type DateRange = { fromDate?: string; toDate?: string }; // ISO date strings (YYYY-MM-DD)

function filterByRange(txns: NormalizedTransaction[], range?: DateRange): NormalizedTransaction[] {
  if (!range?.fromDate && !range?.toDate) return txns;
  const fromTs = range.fromDate ? new Date(range.fromDate).setHours(0, 0, 0, 0) : 0;
  const toTs = range.toDate ? new Date(range.toDate).setHours(23, 59, 59, 999) : Infinity;
  return txns.filter((tx) => {
    const t = new Date((tx.date as string) || 0).getTime();
    return t >= fromTs && t <= toTs;
  });
}

/** Generate a large set of simulated transactions (DeFi, TradFi, CEX, P2P). Optionally filter by date range. */
export function getSimulatedTransactions(range?: DateRange): NormalizedTransaction[] {
  const txns: NormalizedTransaction[] = [];
  let id = 1;

  // DeFi
  for (let i = 0; i < 80; i++) {
    const protocol = pick(DEFI_PROTOCOLS);
    const action = pick(DEFI_ACTIONS);
    const amountUsd = randomAmount(50, 25000);
    const inbound = Math.random() > 0.5;
    txns.push({
      id: `sim-defi-${id++}`,
      source: 'simulated',
      fromId: inbound ? protocol.id : DEFAULT_WALLET,
      toId: inbound ? DEFAULT_WALLET : protocol.id,
      amountUsd,
      date: daysAgo(Math.floor(Math.random() * 180)),
      metadata: { category: 'defi', action, protocol: protocol.name },
    });
  }

  // TradFi
  for (let i = 0; i < 100; i++) {
    const cp = pick(TRADFI_COUNTERPARTIES);
    const action = pick(TRADFI_ACTIONS);
    const amountUsd = cp.id.includes('employer') ? randomAmount(3000, 15000) : randomAmount(5, 800);
    const inbound = cp.id.includes('employer') || cp.id.includes('Refund') || cp.id.includes('Dividend') || cp.id.includes('Interest');
    txns.push({
      id: `sim-tradfi-${id++}`,
      source: 'simulated',
      fromId: inbound ? cp.id : DEFAULT_WALLET,
      toId: inbound ? DEFAULT_WALLET : cp.id,
      amountUsd,
      date: daysAgo(Math.floor(Math.random() * 180)),
      metadata: { category: 'tradfi', action, counterparty: cp.name },
    });
  }

  // CEX
  for (let i = 0; i < 60; i++) {
    const cex = pick(CEX_ADDRESSES);
    const action = pick(CEX_ACTIONS);
    const amountUsd = randomAmount(100, 50000);
    const inbound = action === 'Deposit' || action === 'Staking reward' || action === 'Airdrop' || (action === 'Trade' && Math.random() > 0.5);
    txns.push({
      id: `sim-cex-${id++}`,
      source: 'simulated',
      fromId: inbound ? cex.id : DEFAULT_WALLET,
      toId: inbound ? DEFAULT_WALLET : cex.id,
      amountUsd,
      date: daysAgo(Math.floor(Math.random() * 180)),
      metadata: { category: 'cex', action, exchange: cex.name },
    });
  }

  // P2P
  for (let i = 0; i < 70; i++) {
    const peer = pick(P2P_WALLETS);
    const amountUsd = randomAmount(10, 5000);
    const inbound = Math.random() > 0.5;
    txns.push({
      id: `sim-p2p-${id++}`,
      source: 'simulated',
      fromId: inbound ? peer : DEFAULT_WALLET,
      toId: inbound ? DEFAULT_WALLET : peer,
      amountUsd,
      date: daysAgo(Math.floor(Math.random() * 180)),
      metadata: { category: 'p2p' },
    });
  }

  return filterByRange(txns, range);
}

export { DEFAULT_WALLET as SIMULATED_DEFAULT_WALLET };

export type NodeCategory = 'defi' | 'tradfi' | 'cex' | 'p2p';

const ID_TO_DISPLAY: Record<string, { displayName: string; category: NodeCategory }> = {};
DEFI_PROTOCOLS.forEach((p) => { ID_TO_DISPLAY[p.id.toLowerCase()] = { displayName: p.name, category: 'defi' }; });
TRADFI_COUNTERPARTIES.forEach((p) => { ID_TO_DISPLAY[p.id.toLowerCase()] = { displayName: p.name, category: 'tradfi' }; });
CEX_ADDRESSES.forEach((p) => { ID_TO_DISPLAY[p.id.toLowerCase()] = { displayName: p.name, category: 'cex' }; });
P2P_WALLETS.forEach((w) => { ID_TO_DISPLAY[w.toLowerCase()] = { displayName: `${w.slice(0, 6)}…${w.slice(-4)}`, category: 'p2p' }; });

export function getNodeDisplayInfo(id: string): { displayName: string; category: NodeCategory } | null {
  const info = ID_TO_DISPLAY[id.toLowerCase()];
  if (info) return info;
  if (id.startsWith('tradfi:')) return { displayName: id.split(':').slice(1).join(' '), category: 'tradfi' };
  if (/^0x[a-f0-9]{40}$/i.test(id)) return { displayName: `${id.slice(0, 6)}…${id.slice(-4)}`, category: 'p2p' };
  return null;
}
