// Server-side chain access for the Plaque dashboard.
//
// NOTE ON eth_call: the public Portaldot V3 testnet node currently answers every
// eth_call with "Invalid call: Payment" (verified 2026-10-21, including a plain view
// call on a known-good contract, with four different `from` accounts and two gas
// values). The dashboard therefore reads contract state with eth_getStorageAt and
// eth_getLogs, which do work. Every read is pinned to an explicit block number.

import { keccakHex, keccakText } from './plaque.js';

export const RPC = process.env.NEXT_PUBLIC_PORTALDOT_RPC ?? 'https://test-evm-rpc-v3.portaldot.dev';
export const CHAIN_ID = 420420777;
export const CONTRACT = process.env.NEXT_PUBLIC_PLAQUE_CONTRACT ?? '0xa0e58d0c6392048959c0b16a9d3696fe49d063d6';
export const EXPLORER = 'https://node-console.portaldot.dev';
export const DEPLOY_TX = '0x7857ccc37707d6303f97b6001828b33177e6bd546d16bb00e3597a3ca663f14d';
export const DEPLOY_BLOCK = 132033;

const CLAIMED_SIGNATURE = 'Claimed(bytes32,address,address,uint256)';
const RELEASED_SIGNATURE = 'Released(bytes32,address)';

export const CLAIMED_TOPIC = keccakText(CLAIMED_SIGNATURE);
export const RELEASED_TOPIC = keccakText(RELEASED_SIGNATURE);

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const res = await fetch(RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    cache: 'no-store',
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message ?? 'rpc error');
  return json.result as T;
}

/**
 * The storage slot of `ownerOf[handle]`: keccak256(abi.encode(handle, 0)).
 * The mapping is the contract's first storage item, so its slot is 0.
 */
export function ownerSlot(handle: string): string {
  return keccakHex(handle.replace(/^0x/, '') + '0'.repeat(64)).slice(2);
}

/** The address that owns a handle at `block`, or the zero address. */
export async function readOwner(handle: string, block: number): Promise<string> {
  const slot = '0x' + ownerSlot(handle);
  const raw = await rpc<string>('eth_getStorageAt', [CONTRACT, slot, '0x' + block.toString(16)]);
  return '0x' + raw.slice(-40);
}

export type ClaimEvent = {
  kind: 'claimed' | 'released';
  handle: string;
  who: string;
  sponsor: string | null;
  gasPrice: string | null;
  block: number;
  txHash: string;
  logIndex: number;
};

/** The claim/release events of the registry, newest first. */
export async function readEvents(block: number): Promise<ClaimEvent[]> {
  const fromBlock = Math.max(0, block - 20000);
  const logs = await rpc<any[]>('eth_getLogs', [{
    address: CONTRACT,
    fromBlock: '0x' + fromBlock.toString(16),
    toBlock: '0x' + block.toString(16),
    topics: [],
  }]);
  const out: ClaimEvent[] = [];
  for (const l of logs ?? []) {
    const sig = (l.topics?.[0] ?? '').toLowerCase();
    const isClaimed = sig === CLAIMED_TOPIC;
    const isReleased = sig === RELEASED_TOPIC;
    if (!isClaimed && !isReleased) continue;
    out.push({
      kind: isClaimed ? 'claimed' : 'released',
      handle: '0x' + (l.topics[1] ?? '').slice(-64),
      who: '0x' + (l.topics[2] ?? '').slice(-40),
      sponsor: isClaimed ? '0x' + (l.topics[3] ?? '').slice(-40) : null,
      gasPrice: isClaimed ? BigInt(l.data === '0x' ? '0x0' : l.data).toString() : null,
      block: parseInt(l.blockNumber, 16),
      txHash: l.transactionHash,
      logIndex: parseInt(l.logIndex, 16),
    });
  }
  return out.sort((a, b) => b.block - a.block || b.logIndex - a.logIndex);
}

/** The current head of the chain. */
export async function headBlock(): Promise<number> {
  return Number(BigInt(await rpc<string>('eth_blockNumber', [])));
}
