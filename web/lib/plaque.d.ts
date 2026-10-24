// Type declarations for the dependency-free Plaque SDK (web/lib/plaque.js).
export interface PlaqueHandle {
  ok: boolean;
  name?: string;
  key?: string;
  reason?: string;
}

export interface HandleState {
  status: 'empty' | 'invalid' | 'needs-wallet' | 'available' | 'taken' | 'owned' | 'expired';
  canClaim: boolean;
  canRelease: boolean;
  owner?: string;
  reason?: string;
}

export declare const PORTALDOT: {
  name: string;
  chainId: number;
  rpc: string;
  explorer: string;
  weiPerPot: bigint;
  decimals: number;
};

export declare const PLAQUE_ABI: unknown[];

export declare const REFUSALS: Record<string, string>;

export declare const HANDLE_PATTERN: RegExp;
export declare const MAX_HANDLE_BYTES: number;

export declare function normalizeHandle(input: string): PlaqueHandle;
export declare function handleKey(name: string): string;
export declare function handleNameFromKey(key: string): string;
export declare function buildClaimDigest(args: {
  handle: string;
  who: string;
  chainId: number | bigint;
  contract: string;
  validUntil: number | bigint;
}): string;

export declare function buildClaimDigestV2(args: {
  handle: string;
  who: string;
  chainId: number | bigint;
  contract: string;
}): string;
export declare function keccakHex(input: string | Uint8Array): string;
export declare function keccakText(text: string): string;
export declare function deriveHandleState(state: {
  owner?: string | null;
  connected?: string | null;
  handle: PlaqueHandle;
  now?: number;
  validUntil?: number;
}): HandleState;
export declare function weiToPot(wei: bigint | string | number): string;

export declare function encodeLiteClaim(args: {
  key: string;
  who: string;
  v: number;
  r: string;
  s: string;
}): string;
