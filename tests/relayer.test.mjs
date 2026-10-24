/** The relayer's pre-flight rules: reject before spending gas, accept only a valid signed claim. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { Wallet, getBytes } from 'ethers';
import { buildClaimDigestV2, handleKey, normalizeHandle } from '../web/lib/plaque.js';
import { validateLiteClaim, claimGasLimit, CLAIM_GAS_LIMIT } from '../scripts/relayer-lib.mjs';

const CONTRACT = '0x5432e6b89dc3042d47f2be98e971cad9dabab685';
const CHAIN = 420420777n;

const signed = async (who, handle, chainId = CHAIN) => {
  const digest = buildClaimDigestV2({ handle, who: who.address, chainId, contract: CONTRACT });
  const sig = await who.signMessage(getBytes(digest));
  return {
    handle,
    who: who.address,
    v: parseInt(sig.slice(130, 132), 16),
    r: '0x' + sig.slice(2, 66),
    s: '0x' + sig.slice(66, 130),
  };
};

test('a valid claim is accepted and encoded as five raw words', async () => {
  const who = Wallet.createRandom();
  const claim = await signed(who, handleKey('relayer-ok'));
  const out = validateLiteClaim(claim, { chainId: CHAIN, contract: CONTRACT });
  assert.match(out.data, /^0x[0-9a-f]{320}$/);

  // The dashboard and the relayer share normalizeHandle; every name the UI offers is a name the
  // relayer accepts, and the formats the UI refuses are refused here too.
  for (const name of ['abc', 'a.b-c_d', 'a'.repeat(31)]) {
    assert.equal(normalizeHandle(name).ok, true, name);
    const c = await signed(who, handleKey(name));
    assert.doesNotThrow(() => validateLiteClaim(c, { chainId: CHAIN, contract: CONTRACT }), name);
  }
  // the UI normalises case; the relayer receives the normalised key
  assert.equal(normalizeHandle('Aaa').ok, true);
  const normalizedUpper = normalizeHandle('Aaa');
  assert.equal(normalizedUpper.key, handleKey('aaa'));
  const upperClaim = await signed(who, normalizedUpper.key);
  assert.doesNotThrow(() => validateLiteClaim(upperClaim, { chainId: CHAIN, contract: CONTRACT }));
  for (const name of ['ab', 'bad!', 'a'.repeat(32), '-bad', '']) {
    assert.equal(normalizeHandle(name).ok, false, name);
  }
});

test('forged, cross-chain, zero and non-canonical claims are refused', async () => {
  const who = Wallet.createRandom();
  const handle = handleKey('relayer-bad');
  const good = await signed(who, handle);

  assert.throws(() => validateLiteClaim({ ...good, who: Wallet.createRandom().address }, { chainId: CHAIN, contract: CONTRACT }), /signature does not match who/);
  const otherChain = await signed(who, handle, 1n);
  assert.throws(() => validateLiteClaim(otherChain, { chainId: CHAIN, contract: CONTRACT }), /signature does not match who/);
  assert.throws(() => validateLiteClaim({ ...good, handle: '0x' + '0'.repeat(64) }, { chainId: CHAIN, contract: CONTRACT }), /not displayable|empty/);
  assert.throws(() => validateLiteClaim({ ...good, handle: handleKey('Relayer-Bad') }, { chainId: CHAIN, contract: CONTRACT }), /not canonical/);
  assert.throws(() => validateLiteClaim({ ...good, v: 29 }, { chainId: CHAIN, contract: CONTRACT }), /bad v/);
  assert.throws(() => validateLiteClaim({ ...good, s: '0x12' }, { chainId: CHAIN, contract: CONTRACT }), /bad s/);
});

test('the gas limit is fixed and refuses a sponsor that cannot cover the deposit', () => {
  assert.equal(claimGasLimit({ gasPrice: 33_000n, balance: 10n ** 21n }), CLAIM_GAS_LIMIT);
  assert.throws(() => claimGasLimit({ gasPrice: 33_000n, balance: 10n ** 18n }), /needs/);
  assert.throws(() => claimGasLimit({ gasPrice: 1n, balance: 10n ** 30n }), /gas price too low/);
});
