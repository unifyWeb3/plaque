// Server-side chain access for the Plaque dashboard.
//
// Read path: the dashboard reads contract state with eth_getStorageAt and eth_getLogs and pins
// every read to an explicit block number. eth_call on this node rejects calls from accounts that
// cannot pay the fee ("Invalid call: Payment"), so it is not used for reads.
//
// All public chain parameters come from this file, a byte-for-byte mirror of
// config/plaque.json; the consistency test fails if the two diverge.

import { keccakHex, keccakText } from './plaque.js';
import config from './plaque-config.json';

export const RPC = process.env.NEXT_PUBLIC_PORTALDOT_RPC ?? config.rpc;
export const CHAIN_ID = config.chainId;
export const CONTRACT = process.env.NEXT_PUBLIC_PLAQUE_CONTRACT ?? config.contract;
export const EXPLORER = config.explorer;
export const DEPLOY_TX = config.deployTx;
export const DEPLOY_BLOCK = config.deployBlock;

// Claimed(bytes32 indexed handle, address indexed who, address indexed sponsor): every parameter
// is indexed, so the event carries four topics and no data.
const CLAIMED_SIGNATURE = config.eventSignature;

export const CLAIMED_TOPIC = keccakText(CLAIMED_SIGNATURE);

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const res = await fetch(RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
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

/** The address that owns a handle at `block`, or null when the slot is empty. */
export async function readOwner(handle: string, block: number): Promise<string | null> {
  const slot = '0x' + ownerSlot(handle);
  const raw = await rpc<string>('eth_getStorageAt', [CONTRACT, slot, '0x' + block.toString(16)]);
  const owner = '0x' + raw.slice(-40);
  return /^0x0{40}$/.test(owner) ? null : owner;
}

export type ClaimEvent = {
  kind: 'claimed';
  handle: string;
  who: string;
  sponsor: string;
  block: number;
  txHash: string;
  logIndex: number;
};

/** The Claimed events of the registry, newest first, from the deployment block to `block`. */
export async function readEvents(block: number): Promise<ClaimEvent[]> {
  // Start at the deployment block, not an arbitrary rolling window: the live claim at block
  // 167209 must remain visible as the chain advances. If the node has pruned the range, the
  // query throws and the caller shows an error rather than pretending the registry is empty.
  const logs = await rpc<any[]>('eth_getLogs', [{
    address: CONTRACT,
    fromBlock: '0x' + DEPLOY_BLOCK.toString(16),
    toBlock: '0x' + block.toString(16),
    topics: [CLAIMED_TOPIC],
  }]);
  const out: ClaimEvent[] = [];
  for (const l of logs ?? []) {
    if (l.removed) continue;
    if ((l.topics?.[0] ?? '').toLowerCase() !== CLAIMED_TOPIC) continue;
    if ((l.topics?.length ?? 0) < 4) continue;
    out.push({
      kind: 'claimed',
      handle: '0x' + (l.topics[1] ?? '').slice(-64),
      who: '0x' + (l.topics[2] ?? '').slice(-40),
      sponsor: '0x' + (l.topics[3] ?? '').slice(-40),
      block: parseInt(l.blockNumber, 16),
      txHash: l.transactionHash,
      logIndex: parseInt(l.logIndex, 16),
    });
  }
  return out.sort((a, b) => b.block - a.block || b.logIndex - a.logIndex);
}

let chainCheck: Promise<void> | null = null;

/** Fail closed if the configured RPC is serving a different chain. Checked once per process. */
async function assertChain(): Promise<void> {
  if (!chainCheck) {
    chainCheck = rpc<string>('eth_chainId', []).then((id) => {
      if (Number.parseInt(id, 16) !== CHAIN_ID) {
        throw new Error(`RPC chain ${Number.parseInt(id, 16)} does not match config chain ${CHAIN_ID}`);
      }
    });
  }
  return chainCheck;
}

/** The current head of the chain. */
export async function headBlock(): Promise<number> {
  await assertChain();
  return Number(BigInt(await rpc<string>('eth_blockNumber', [])));
}
