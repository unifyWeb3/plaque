// Server-side chain access for the Plaque dashboard.
//
// Read path: the dashboard reads contract state with eth_getStorageAt and eth_getLogs and pins
// every read to an explicit block number. eth_call on this node rejects calls from accounts that
// cannot pay the fee ("Invalid call: Payment"), so it is not used for reads.

import { keccakHex, keccakText } from './plaque.js';

export const RPC = process.env.NEXT_PUBLIC_PORTALDOT_RPC ?? 'https://test-evm-rpc-v3.portaldot.dev';
export const CHAIN_ID = 420420777;
// The live registry: PlaqueLite, deployed 2026-10-22 in block 167044. It is the chain-compatible
// build - no BLOCK-family opcode anywhere - and it has already accepted a live sponsored claim.
export const CONTRACT = process.env.NEXT_PUBLIC_PLAQUE_CONTRACT ?? '0x5432e6b89dc3042d47f2be98e971cad9dabab685';
export const EXPLORER = 'https://node-console.portaldot.dev';
export const DEPLOY_TX = '0xcee4d1db6c86250faa16bd67419168c7628c8a88533bf3d84316ccfd0c3bb63a';
export const DEPLOY_BLOCK = 167044;

// Claimed(bytes32 indexed handle, address indexed who, address indexed sponsor): every parameter
// is indexed, so the event carries four topics and no data.
const CLAIMED_SIGNATURE = 'Claimed(bytes32,address,address)';

export const CLAIMED_TOPIC = keccakText(CLAIMED_SIGNATURE);

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
    topics: [CLAIMED_TOPIC],
  }]);
  const out: ClaimEvent[] = [];
  for (const l of logs ?? []) {
    if ((l.topics?.[0] ?? '').toLowerCase() !== CLAIMED_TOPIC) continue;
    if ((l.topics?.length ?? 0) < 4) continue;
    out.push({
      kind: 'claimed',
      handle: '0x' + (l.topics[1] ?? '').slice(-64),
      who: '0x' + (l.topics[2] ?? '').slice(-40),
      sponsor: '0x' + (l.topics[3] ?? '').slice(-40),
      // the lite event does not carry the gas price; the transaction does, and the explorer
      // shows it. The UI links to the transaction instead of printing a made-up number.
      gasPrice: null,
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
