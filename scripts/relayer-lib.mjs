// Pure validation helpers for the sponsor relayer. Kept separate from the HTTP server so the
// rejection rules can be tested without opening a port or touching a chain.
import { getBytes, verifyMessage, isAddress } from 'ethers';
import { buildClaimDigestV2, encodeLiteClaim, handleNameFromKey, normalizeHandle } from '../web/lib/plaque.js';

export const CLAIM_GAS_LIMIT = 130_000_000_000_000n; // 1.3e14; live claim used 1.1756e14
export const CLAIM_DEPOSIT_NEED = 4_000_000_000_000_000_000n; // 4 tPOT, just above measured 3.87

/** The calldata and digest for a lite claim, or a thrown Error describing the refusal. */
export function validateLiteClaim(claim, { chainId, contract }) {
  const { handle, who, v, r, s } = claim ?? {};
  if (typeof handle !== 'string' || !/^0x[0-9a-fA-F]{64}$/.test(handle)) throw new Error('bad handle');
  // The deployed lite contract accepts the all-zero key; this rail refuses it before spending.
  if (/^0x0{64}$/i.test(handle)) throw new Error('empty handle');
  if (typeof who !== 'string' || !isAddress(who)) throw new Error('bad address');
  if (who.toLowerCase() === '0x0000000000000000000000000000000000000000') throw new Error('zero address');
  if (!Number.isInteger(v) || v < 27 || v > 28) throw new Error('bad v');
  if (typeof r !== 'string' || !/^0x[0-9a-fA-F]{64}$/.test(r)) throw new Error('bad r');
  if (typeof s !== 'string' || !/^0x[0-9a-fA-F]{64}$/.test(s)) throw new Error('bad s');

  // The sponsored rail only accepts the same handle format the dashboard can produce. The
  // contract itself accepts any 32-byte key (documented limit); this is relayer policy, not a
  // contract guarantee.
  const name = handleNameFromKey(handle);
  const normalized = normalizeHandle(name);
  if (!normalized.ok) throw new Error(`handle is not displayable: ${normalized.reason}`);
  if (normalized.key.toLowerCase() !== handle.toLowerCase()) throw new Error('handle is not canonical');

  const digest = buildClaimDigestV2({ handle, who, chainId, contract });
  const signature = `0x${r.slice(2)}${s.slice(2)}${v.toString(16).padStart(2, '0')}`;
  let recovered;
  try {
    recovered = verifyMessage(getBytes(digest), signature);
  } catch {
    throw new Error('invalid signature');
  }
  if (!isAddress(recovered) || recovered.toLowerCase() === '0x0000000000000000000000000000000000000000') {
    throw new Error('signature recovered the zero address');
  }
  if (recovered.toLowerCase() !== who.toLowerCase()) throw new Error('signature does not match who');

  return { data: encodeLiteClaim({ key: handle, who, v, r, s }), digest };
}

/** Fixed gas limit sized for the measured storage deposit; never the whole sponsor balance. */
export function claimGasLimit({ gasPrice, balance, reserveWei = 0n }) {
  const gp = BigInt(gasPrice);
  const bal = BigInt(balance);
  const reserve = BigInt(reserveWei);
  if (CLAIM_GAS_LIMIT * gp < CLAIM_DEPOSIT_NEED) {
    throw new Error('gas price too low for the measured storage deposit');
  }
  if (bal < CLAIM_GAS_LIMIT * gp + reserve) {
    throw new Error(`the sponsor holds ${bal} wei; one claim needs ~${CLAIM_GAS_LIMIT * gp + reserve} wei including the reserve`);
  }
  return CLAIM_GAS_LIMIT;
}
