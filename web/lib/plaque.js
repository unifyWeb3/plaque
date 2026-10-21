/**
 * Plaque SDK — shared by the Next.js app and the test suite.
 *
 * This module is the single source of truth for:
 *   - handle normalisation and the 32-byte handle key,
 *   - the claim digest (byte-for-byte identical to contracts/Plaque.sol),
 *   - the pure state function that drives every UI action.
 *
 * No secret, no private key and no network call lives in this file.
 */

/** Portaldot V3 testnet parameters (verified live, see state/MEMORY.md). */
export const PORTALDOT = {
  name: 'Portaldot V3 testnet',
  chainId: 420420777,
  rpc: 'https://test-evm-rpc-v3.portaldot.dev',
  explorer: 'https://node-console.portaldot.dev',
  /** 1 tPOT = 1e14 native units = 1e18 wei (nativeToEthRatio = 10_000). */
  weiPerPot: 10n ** 18n,
  decimals: 14,
};

/** Contract ABI. `tests/plaque.test.mjs` asserts this is identical to the compiled artifact. */
export const PLAQUE_ABI = [
  {
    type: 'function',
    name: 'ownerOf',
    stateMutability: 'view',
    inputs: [{ name: 'handle', type: 'bytes32' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    type: 'function',
    name: 'claim',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'handle', type: 'bytes32' },
      { name: 'who', type: 'address' },
      { name: 'v', type: 'uint8' },
      { name: 'r', type: 'bytes32' },
      { name: 's', type: 'bytes32' },
      { name: 'validUntil', type: 'uint64' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'release',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'handle', type: 'bytes32' }],
    outputs: [],
  },
  {
    type: 'event',
    name: 'Claimed',
    anonymous: false,
    inputs: [
      { name: 'handle', type: 'bytes32', indexed: true },
      { name: 'who', type: 'address', indexed: true },
      { name: 'sponsor', type: 'address', indexed: true },
      { name: 'gasPrice', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'Released',
    anonymous: false,
    inputs: [
      { name: 'handle', type: 'bytes32', indexed: true },
      { name: 'who', type: 'address', indexed: true },
    ],
  },
  { type: 'error', name: 'Unavailable', inputs: [] },
  { type: 'error', name: 'ClaimExpired', inputs: [] },
  { type: 'error', name: 'BadSignature', inputs: [] },
  { type: 'error', name: 'NotOwner', inputs: [] },
];

/** Contract-level refusals. The UI must never offer an action that produces one of these. */
export const REFUSALS = {
  Unavailable: 'handle is empty or already owned',
  ClaimExpired: 'the signed claim is no longer valid',
  BadSignature: 'the signature does not match the claim',
  NotOwner: 'only the owner can release a handle',
};

export const HANDLE_PATTERN = /^[a-z0-9][a-z0-9._-]{2,30}$/;
export const MAX_HANDLE_BYTES = 31;

/**
 * Normalise a user-typed handle.
 * @param {string} input
 * @returns {{ok: boolean, name?: string, key?: string, reason?: string}}
 */
export function normalizeHandle(input) {
  const name = String(input ?? '')
    .trim()
    .toLowerCase();
  if (name.length === 0) return { ok: false, reason: 'enter a handle' };
  if (Buffer.byteLength(name, 'utf8') > MAX_HANDLE_BYTES) {
    return { ok: false, reason: `handles are at most ${MAX_HANDLE_BYTES} bytes` };
  }
  if (!HANDLE_PATTERN.test(name)) {
    return { ok: false, reason: 'use 3-31 characters: a-z, 0-9, dot, dash or underscore' };
  }
  return { ok: true, name, key: handleKey(name) };
}

/** The 32-byte handle key: the UTF-8 name, zero-padded. */
export function handleKey(name) {
  const bytes = Buffer.from(name, 'utf8');
  if (bytes.length > MAX_HANDLE_BYTES) throw new Error('handle too long');
  return '0x' + Buffer.concat([bytes, Buffer.alloc(32 - bytes.length)]).toString('hex');
}

/** The display name for a handle key: the key's bytes with the trailing NUL padding removed. */
export function handleNameFromKey(key) {
  const bytes = Buffer.from(String(key).replace(/^0x/, ''), 'hex');
  let end = bytes.length;
  while (end > 0 && bytes[end - 1] === 0) end -= 1;
  return bytes.subarray(0, end).toString('utf8');
}

/**
 * The claim digest — identical to the Solidity implementation in contracts/Plaque.sol:
 *   keccak256(abi.encode(
 *     bytes32(1), handle, bytes32(uint160(who)), bytes32(validUntil), bytes32(chainId), bytes32(address(this))))
 * @param {{handle: string, who: string, chainId: number|bigint, contract: string, validUntil: number|bigint}} args
 * @returns {string} 32-byte hex string
 */
export function buildClaimDigest({ handle, who, chainId, contract, validUntil }) {
  const key = String(handle).replace(/^0x/, '').padEnd(64, '0');
  const whoHex = BigInt(who).toString(16).padStart(64, '0');
  const parts = [
    '0x' + (1).toString(16).padStart(64, '0'),
    '0x' + key,
    '0x' + whoHex,
    '0x' + BigInt(validUntil).toString(16).padStart(64, '0'),
    '0x' + BigInt(chainId).toString(16).padStart(64, '0'),
    '0x' + BigInt(contract).toString(16).padStart(64, '0'),
  ];
  return keccakHex('0x' + parts.map((p) => p.slice(2)).join(''));
}

/** keccak256 of a UTF-8 string (used for event signatures and domain tags). */
export function keccakText(text) {
  return '0x' + keccakBytes(new TextEncoder().encode(text));
}

/** keccak256 of a hex string or raw bytes; throws if the input is malformed. */
export function keccakHex(hex) {
  let bytes;
  if (hex instanceof Uint8Array) {
    bytes = hex;
  } else {
    const clean = String(hex).replace(/^0x/, '');
    if (!/^[0-9a-fA-F]*$/.test(clean) || clean.length % 2 !== 0) {
      throw new Error('invalid hex input to keccak');
    }
    bytes = new Uint8Array(clean.length / 2);
    for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return '0x' + keccakBytes(bytes);
}

// Small, dependency-free keccak-256 (FIPS-202) so the SDK can run in the browser and in
// node --test without pulling a crypto bundle into the client.
const KECCAK_RC = [
  0x00000001n, 0x00008082n, 0x800000000000808an, 0x8000000080008000n, 0x000000000000808bn,
  0x0000000080000001n, 0x8000000080008081n, 0x8000000000008009n, 0x000000000000008an,
  0x0000000000000088n, 0x0000000080008009n, 0x000000008000000an, 0x000000008000808bn,
  0x800000000000008bn, 0x8000000000008089n, 0x8000000000008003n, 0x8000000000008002n,
  0x8000000000000080n, 0x000000000000800an, 0x800000008000000an, 0x8000000080008081n,
  0x8000000000008080n, 0x0000000080000001n, 0x8000000080008008n,
];
const ROT = [
  0, 1, 62, 28, 27, 36, 44, 6, 55, 20, 3, 10, 43, 25, 39, 41, 45, 15, 21, 8, 18, 2, 61, 56, 14,
];
const M64 = (1n << 64n) - 1n;
const rotl = (x, n) => n === 0 ? x : (((x << BigInt(n)) | (x >> BigInt(64 - n))) & M64);

function keccakBytes(input) {
  const rate = 136; // 1088 bits for keccak-256
  const padded = new Uint8Array(Math.ceil((input.length + 1) / rate) * rate);
  padded.set(input);
  padded[input.length] |= 0x01;
  padded[padded.length - 1] |= 0x80;

  const lanes = new Array(25).fill(0n);
  for (let off = 0; off < padded.length; off += rate) {
    for (let i = 0; i < rate / 8; i++) {
      let lane = 0n;
      for (let b = 7; b >= 0; b--) lane = (lane << 8n) | BigInt(padded[off + i * 8 + b]);
      lanes[i] ^= lane;
    }
    keccakF(lanes);
  }
  let out = '';
  for (let i = 0; i < 4; i++) {
    let lane = lanes[i];
    for (let b = 0; b < 8; b++) out += (Number(lane & 0xffn)).toString(16).padStart(2, '0'), lane >>= 8n;
  }
  return out;
}

function keccakF(lanes) {
  for (let round = 0; round < 24; round++) {
    const c = new Array(5).fill(0n);
    for (let x = 0; x < 5; x++) c[x] = lanes[x] ^ lanes[x + 5] ^ lanes[x + 10] ^ lanes[x + 15] ^ lanes[x + 20];
    for (let x = 0; x < 5; x++) {
      const d = c[(x + 4) % 5] ^ rotl(c[(x + 1) % 5], 1);
      for (let y = 0; y < 25; y += 5) lanes[x + y] ^= d;
    }
    const b = new Array(25).fill(0n);
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) {
        b[y + 5 * ((2 * x + 3 * y) % 5)] = rotl(lanes[x + 5 * y], ROT[x + 5 * y]);
      }
    }
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) {
        lanes[x + 5 * y] = b[x + 5 * y] ^ ((~b[((x + 1) % 5) + 5 * y] & M64) & b[((x + 2) % 5) + 5 * y]);
      }
    }
    lanes[0] ^= KECCAK_RC[round];
  }
}

/**
 * The one pure function that decides what the UI may offer.
 * It is a function of chain state only — never of anything the UI invented.
 *
 * @param {{owner: string|null, connected: string|null, handle: {ok: boolean, reason?: string},
 *          now?: number, validUntil?: number}} state
 * @returns {{status: string, canClaim: boolean, canRelease: boolean, reason?: string}}
 */
export function deriveHandleState(state) {
  const { owner = null, connected = null, handle, now = 0, validUntil = 0 } = state ?? {};
  if (!handle || !handle.ok) {
    const empty = handle && !handle.name && handle.reason === 'enter a handle';
    return {
      status: empty ? 'empty' : 'invalid',
      canClaim: false,
      canRelease: false,
      reason: handle?.reason,
    };
  }
  if (!connected) {
    return { status: 'needs-wallet', canClaim: false, canRelease: false, reason: 'connect a wallet to sign' };
  }
  if (owner && owner.toLowerCase() === connected.toLowerCase()) {
    return { status: 'owned', canClaim: false, canRelease: true, owner };
  }
  if (owner) {
    return { status: 'taken', canClaim: false, canRelease: false, owner, reason: REFUSALS.Unavailable };
  }
  if (validUntil && now > validUntil) {
    return { status: 'expired', canClaim: false, canRelease: false, reason: REFUSALS.ClaimExpired };
  }
  return { status: 'available', canClaim: true, canRelease: false };
}

/** Wei (18-decimal EVM units) to tPOT, for display. */
export function weiToPot(wei) {
  const v = BigInt(wei);
  const whole = v / PORTALDOT.weiPerPot;
  const frac = v % PORTALDOT.weiPerPot;
  const fracStr = frac.toString().padStart(18, '0').slice(0, 6).replace(/0+$/, '');
  return fracStr ? `${whole}.${fracStr}` : `${whole}`;
}
