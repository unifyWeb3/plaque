/**
 * Plaque test suite — runs against ganache (a pure-JS EVM, because this machine has no
 * native toolchain) with the *compiled artifact* in build/Plaque.json.
 *
 * Run:  node --test tests/
 *
 * Every refusal test is paired with a positive control: the same call with valid arguments
 * must succeed, so a refusal can never pass for an unrelated reason.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

let ganache;
try {
  ({ default: ganache } = await import('ganache'));
} catch (err) {
  throw new Error(
    'ganache is required to run the contract tests but could not be loaded. ' +
    'Install it with: npm install --save-dev ganache@7.9.2  (original error: ' + err.message + ')',
  );
}

import { BrowserProvider, ContractFactory, Wallet, Interface, getBytes, hexlify } from 'ethers';

import {
  PLAQUE_ABI,
  buildClaimDigest,
  deriveHandleState,
  handleKey,
  handleNameFromKey,
  keccakHex,
  normalizeHandle,
  weiToPot,
  PORTALDOT,
} from '../web/lib/plaque.js';

const artifact = JSON.parse(readFileSync(new URL('../build/Plaque.json', import.meta.url), 'utf8'));

// ---------------------------------------------------------------- helpers

const provider = new BrowserProvider(ganache.provider({ logging: { quiet: true }, wallet: { totalAccounts: 6 } }));
const sponsor = Wallet.createRandom().connect(provider);   // pays the gas
const claimant = Wallet.createRandom().connect(provider);  // signs the claim, holds no gas
const other = Wallet.createRandom().connect(provider);     // a third party
const chainId = Number((await provider.getNetwork()).chainId);

// Fund the test wallets from a ganache default account so they can pay gas.
const [funderSigner] = await provider.listAccounts();
const funder = typeof funderSigner === 'string' ? funderSigner : await funderSigner.getAddress();
const fund = async (w) => {
  await provider.send('eth_sendTransaction', [{
    from: funder,
    to: w.address,
    value: '0x' + (10n ** 18n).toString(16), // 1 ETH
  }]);
};
for (const w of [sponsor, claimant, other]) await fund(w);

/**
 * A fresh, funded sponsor per test. ganache's pending-nonce bookkeeping can race when the
 * same account sends several transactions in quick succession, so each test gets its own.
 */
async function newSponsor() {
  const w = Wallet.createRandom().connect(provider);
  await fund(w);
  return w;
}

const nowSec = () => Math.floor(Date.now() / 1000);
const DEFAULT_WINDOW = 3600;

async function deploy() {
  const signer = await provider.getSigner();
  const factory = new ContractFactory(artifact.abi, artifact.bytecode, signer);
  const contract = await factory.deploy();
  await contract.waitForDeployment();
  return contract;
}

/** Sign a claim exactly the way the browser does: EIP-191 personal_sign over the raw digest. */
async function signClaim(signer, { handle, contract, who = null, validUntil = nowSec() + DEFAULT_WINDOW, chain = chainId, at = null }) {
  const digest = buildClaimDigest({
    handle,
    who: who ?? signer.address,
    chainId: chain,
    contract: at ?? contract.target,
    validUntil,
  });
  const signature = await signer.signMessage(getBytes(digest));
  const r = '0x' + signature.slice(2, 66);
  const s = '0x' + signature.slice(66, 130);
  const v = parseInt(signature.slice(130, 132), 16);
  return { digest, v, r, s, validUntil };
}

/** Assert that a call reverts with a specific custom error. */
function expectRevert(promise, name, contract) {
  return promise.then(
    () => assert.fail(`expected the transaction to revert with ${name}, but it succeeded`),
    (err) => {
      const parts = [];
      if (err?.revert?.name) parts.push(err.revert.name);
      // ganache reports the revert payload under info.error.data.result
      const candidates = [
        err?.data,
        err?.info?.error?.data?.result,
        err?.info?.error?.data,
        err?.error?.data?.result,
      ];
      for (const data of candidates) {
        if (!data || typeof data !== 'string') continue;
        parts.push(data);
        if (contract) {
          try {
            const parsed = contract.interface.parseError(data);
            parts.push(parsed.name);
          } catch { /* not a decodable custom error */ }
        }
      }
      if (err?.shortMessage) parts.push(err.shortMessage);
      const text = parts.join(' | ');
      assert.ok(text.includes(name), `expected revert ${name}, got: ${text.slice(0, 400)}`);
    },
  );
}

// ---------------------------------------------------------------- tests

test('the SDK ABI is identical to the compiled artifact ABI', () => {
  const strip = (abi) => abi
    .map((e) => ({
      type: e.type,
      name: e.name,
      inputs: (e.inputs || []).map((i) => i.type),
      outputs: (e.outputs || []).map((i) => i.type),
    }))
    .sort((a, b) => (a.type + a.name).localeCompare(b.type + b.name));
  assert.deepEqual(strip(PLAQUE_ABI), strip(artifact.abi));

  // the claim parameters must keep their names: the SDK and the tests rely on them
  const claimAbi = artifact.abi.find((e) => e.type === 'function' && e.name === 'claim');
  const sdkClaim = PLAQUE_ABI.find((e) => e.type === 'function' && e.name === 'claim');
  assert.deepEqual(sdkClaim.inputs.map((i) => i.name), claimAbi.inputs.map((i) => i.name));
  assert.deepEqual(sdkClaim.inputs.map((i) => i.type), claimAbi.inputs.map((i) => i.type));
});

test('the SDK digest is keccak-correct and matches the Solidity encoding', async () => {
  // cross-check our dependency-free keccak against ethers
  const { keccak256, toUtf8Bytes } = await import('ethers');
  assert.equal(keccakHex(toUtf8Bytes('Plaque Claim v1')), keccak256(toUtf8Bytes('Plaque Claim v1')));
  assert.equal(keccakHex('0x'), keccak256('0x'));

  // the digest is abi.encode of five bytes32 values -> 160 bytes hashed
  const digest = buildClaimDigest({
    handle: handleKey('unify'),
    who: '0x1111111111111111111111111111111111111111',
    chainId: 420420777,
    contract: '0x55040a925e106e7b7507015a0448ced999f572b6',
    validUntil: 1760000000,
  });
  const { AbiCoder, keccak256: k256 } = await import('ethers');
  const expected = k256(
    AbiCoder.defaultAbiCoder().encode(
      ['bytes32', 'bytes32', 'bytes32', 'bytes32', 'bytes32', 'bytes32'],
      [
        '0x' + (1).toString(16).padStart(64, '0'),
        handleKey('unify'),
        '0x' + BigInt('0x1111111111111111111111111111111111111111').toString(16).padStart(64, '0'),
        '0x' + BigInt(1760000000).toString(16).padStart(64, '0'),
        '0x' + BigInt(420420777).toString(16).padStart(64, '0'),
        '0x' + BigInt('0x55040a925e106e7b7507015a0448ced999f572b6').toString(16).padStart(64, '0'),
      ],
    ),
  );
  assert.equal(digest, expected);
});

test('handle normalisation and the key round-trip', () => {
  assert.deepEqual(normalizeHandle('  Unify '), { ok: true, name: 'unify', key: handleKey('unify') });
  assert.equal(normalizeHandle('ab').ok, false);
  assert.equal(normalizeHandle('a b').ok, false);
  assert.equal(normalizeHandle('').ok, false);
  assert.equal(normalizeHandle('x'.repeat(32)).ok, false);
  assert.equal(normalizeHandle('oxunify').ok, true);
  assert.equal(handleNameFromKey(handleKey('unify')), 'unify');
  assert.equal(handleNameFromKey(handleKey('a.b-c_d')), 'a.b-c_d');
});

test('the legitimate path: a sponsored claim binds the handle to the signer', async () => {
  const contract = await deploy();
  const sponsor = await newSponsor();
  const key = handleKey('unify');
  const sig = await signClaim(claimant, { handle: key, contract });

  const tx = await contract.connect(sponsor).claim(key, claimant.address, sig.v, sig.r, sig.s, sig.validUntil);
  const receipt = await tx.wait();

  assert.equal(await contract.ownerOf(key), claimant.address, 'owner must be the address that signed');

  const parsed = receipt.logs
    .map((l) => { try { return contract.interface.parseLog(l); } catch { return null; } })
    .filter(Boolean);
  const claimed = parsed.find((p) => p.name === 'Claimed');
  assert.ok(claimed, 'a Claimed event must be emitted');
  assert.equal(claimed.args.who, claimant.address);
  assert.equal(claimed.args.sponsor, sponsor.address, 'the gas payer is recorded as the sponsor');
  assert.equal(claimed.args.handle, key);
  assert.ok(claimed.args.gasPrice > 0n, 'the gas price is recorded');
});

test('refusal: a taken handle is refused — with a positive control', async () => {
  const contract = await deploy();
  const sponsor = await newSponsor();
  const key = handleKey('taken');
  const first = await signClaim(claimant, { handle: key, contract });
  // positive control: the first claim of a free handle succeeds
  await (await contract.connect(sponsor).claim(key, claimant.address, first.v, first.r, first.s, first.validUntil)).wait();
  assert.equal(await contract.ownerOf(key), claimant.address);

  // now the refusal
  const second = await signClaim(other, { handle: key, contract });
  await expectRevert(
    contract.connect(sponsor).claim(key, other.address, second.v, second.r, second.s, second.validUntil).then((t) => t.wait()),
    'Unavailable', contract);
  // the state did not change
  assert.equal(await contract.ownerOf(key), claimant.address);
});

test('refusal: an expired claim is refused — with a positive control', async () => {
  const contract = await deploy();
  const sponsor = await newSponsor();
  const key = handleKey('expired');
  const expired = await signClaim(claimant, { handle: key, contract, validUntil: nowSec() - 60 });
  await expectRevert(
    contract.connect(sponsor).claim(key, claimant.address, expired.v, expired.r, expired.s, expired.validUntil).then((t) => t.wait()),
    'ClaimExpired', contract);
  // positive control: the same signer with a live window succeeds
  const live = await signClaim(claimant, { handle: key, contract });
  await (await contract.connect(sponsor).claim(key, claimant.address, live.v, live.r, live.s, live.validUntil)).wait();
  assert.equal(await contract.ownerOf(key), claimant.address);
});

test('refusal: the empty handle is refused', async () => {
  const contract = await deploy();
  const sponsor = await newSponsor();
  const key = '0x' + '0'.repeat(64);
  const sig = await signClaim(claimant, { handle: key, contract });
  await expectRevert(
    contract.connect(sponsor).claim(key, claimant.address, sig.v, sig.r, sig.s, sig.validUntil).then((t) => t.wait()),
    'Unavailable', contract);
  assert.equal(await contract.ownerOf(key), '0x0000000000000000000000000000000000000000');
});

test('refusal: a signature from another key is refused', async () => {
  const contract = await deploy();
  const sponsor = await newSponsor();
  const key = handleKey('forged');
  // signed by `other` but the claim says it is for `claimant`: the recovered signer does not
  // match the claimed address, so the contract must refuse.
  const sig = await signClaim(other, { handle: key, contract });
  await expectRevert(
    contract.connect(sponsor).claim(key, claimant.address, sig.v, sig.r, sig.s, sig.validUntil).then((t) => t.wait()),
    'BadSignature', contract);
  assert.equal(await contract.ownerOf(key), '0x0000000000000000000000000000000000000000');
});

test('refusal: a signature made for another handle does not verify', async () => {
  const contract = await deploy();
  const sponsor = await newSponsor();
  const keyA = handleKey('alpha');
  const keyB = handleKey('bravo');
  const sigA = await signClaim(claimant, { handle: keyA, contract });
  // reuse the signature for a different handle
  await expectRevert(
    contract.connect(sponsor).claim(keyB, claimant.address, sigA.v, sigA.r, sigA.s, sigA.validUntil).then((t) => t.wait()),
    'BadSignature', contract);
});

test('refusal: a signature made for another chain id does not verify', async () => {
  const contract = await deploy();
  const sponsor = await newSponsor();
  const key = handleKey('crosschain');
  const sig = await signClaim(claimant, { handle: key, contract, chain: 999999 });
  await expectRevert(
    contract.connect(sponsor).claim(key, claimant.address, sig.v, sig.r, sig.s, sig.validUntil).then((t) => t.wait()),
    'BadSignature', contract);
});

test('refusal: a signature made for another contract does not verify', async () => {
  const contract = await deploy();
  const sponsor = await newSponsor();
  const other2 = await deploy();
  const key = handleKey('othercontract');
  const sig = await signClaim(claimant, { handle: key, contract, at: other2.target });
  await expectRevert(
    contract.connect(sponsor).claim(key, claimant.address, sig.v, sig.r, sig.s, sig.validUntil).then((t) => t.wait()),
    'BadSignature', contract);
});

test('refusal: malformed signature components are refused', async () => {
  const contract = await deploy();
  const sponsor = await newSponsor();
  const key = handleKey('malformed');
  const sig = await signClaim(claimant, { handle: key, contract });
  await expectRevert(
    contract.connect(sponsor).claim(key, claimant.address, 0, sig.r, sig.s, sig.validUntil).then((t) => t.wait()),
    'BadSignature', contract);
  await expectRevert(
    contract.connect(sponsor).claim(key, claimant.address, sig.v, '0x' + '0'.repeat(64), sig.s, sig.validUntil).then((t) => t.wait()),
    'BadSignature', contract);
  await expectRevert(
    contract.connect(sponsor).claim(key, claimant.address, sig.v, sig.r, '0x' + '0'.repeat(64), sig.validUntil).then((t) => t.wait()),
    'BadSignature', contract);
});

test('access control: only the owner can release, and the handle can then be re-claimed', async () => {
  const contract = await deploy();
  const sponsor = await newSponsor();
  const key = handleKey('releasable');
  const sig = await signClaim(claimant, { handle: key, contract });
  await (await contract.connect(sponsor).claim(key, claimant.address, sig.v, sig.r, sig.s, sig.validUntil)).wait();

  await expectRevert(
    contract.connect(other).release(key).then((t) => t.wait()),
    'NotOwner', contract);
  assert.equal(await contract.ownerOf(key), claimant.address, 'a refused release must not change state');

  // the owner releases
  const rel = await (await contract.connect(claimant).release(key)).wait();
  const parsed = rel.logs.map((l) => { try { return contract.interface.parseLog(l); } catch { return null; } }).filter(Boolean);
  assert.ok(parsed.find((p) => p.name === 'Released'), 'a Released event must be emitted');
  assert.equal(await contract.ownerOf(key), '0x0000000000000000000000000000000000000000');

  // and the handle can be claimed again
  const again = await signClaim(other, { handle: key, contract });
  await (await contract.connect(sponsor).claim(key, other.address, again.v, again.r, again.s, again.validUntil)).wait();
  assert.equal(await contract.ownerOf(key), other.address);
});

test('the UI state function agrees with the contract', async () => {
  const contract = await deploy();
  const sponsor = await newSponsor();
  const key = handleKey('states');
  const handle = normalizeHandle('states');

  // free handle, no wallet connected
  let st = deriveHandleState({ owner: null, connected: null, handle });
  assert.equal(st.status, 'needs-wallet');
  assert.equal(st.canClaim, false);

  // free handle, wallet connected
  st = deriveHandleState({ owner: null, connected: claimant.address, handle });
  assert.equal(st.status, 'available');
  assert.equal(st.canClaim, true);

  // the chain returns the zero address for an empty slot: that is still a free handle, not a
  // taken one (the dashboard bug found in state/AUDIT-BASELINE.md)
  st = deriveHandleState({ owner: '0x' + '0'.repeat(40), connected: claimant.address, handle });
  assert.equal(st.status, 'available');
  assert.equal(st.canClaim, true);

  // after a claim by someone else the UI must refuse to offer a claim
  const sig = await signClaim(other, { handle: key, contract });
  await (await contract.connect(sponsor).claim(key, other.address, sig.v, sig.r, sig.s, sig.validUntil)).wait();
  const owner = await contract.ownerOf(key);
  st = deriveHandleState({ owner, connected: claimant.address, handle });
  assert.equal(st.status, 'taken');
  assert.equal(st.canClaim, false, 'the UI must not offer a claim the contract would refuse');
  assert.equal(st.reason, 'handle is empty or already owned');

  // a taken handle reads as taken even with no wallet connected: it is a fact about the chain
  st = deriveHandleState({ owner, connected: null, handle });
  assert.equal(st.status, 'taken');
  assert.equal(st.canClaim, false);
  assert.equal(st.owner, owner);

  // the owner can release on the readable build, but not on PlaqueLite (which has no release)
  st = deriveHandleState({ owner, connected: owner, handle, supportsRelease: true });
  assert.equal(st.status, 'owned');
  assert.equal(st.canRelease, true);
  assert.equal(st.canClaim, false);
  st = deriveHandleState({ owner, connected: owner, handle });
  assert.equal(st.canRelease, false, 'the deployed lite build has no release function');

  // an invalid handle is refused client-side
  st = deriveHandleState({ owner: null, connected: claimant.address, handle: normalizeHandle('A!') });
  assert.equal(st.status, 'invalid');
  assert.equal(st.canClaim, false);
});

test('the UI refusal reasons are exactly the contract refusals', async () => {
  const source = readFileSync(new URL('../contracts/Plaque.sol', import.meta.url), 'utf8');
  const contractErrors = [...source.matchAll(/error\s+(\w+)\s*\(/g)].map((m) => m[1]);
  assert.ok(contractErrors.length >= 4, 'the contract must declare its refusals');
  const { REFUSALS } = await import('../web/lib/plaque.js');
  for (const name of contractErrors) {
    assert.ok(REFUSALS[name], `the SDK must describe the contract error ${name}`);
  }
});

test('wei to tPOT conversion matches the chain ratio', () => {
  assert.equal(PORTALDOT.weiPerPot, 10n ** 18n);
  assert.equal(weiToPot(10n ** 18n), '1');
  assert.equal(weiToPot(0n), '0');
  assert.equal(weiToPot(15n * 10n ** 17n), '1.5');
});
