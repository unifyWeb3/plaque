/**
 * PlaqueLite vs PlaqueV2 — the two chain-compatible builds must implement the *same* claim.
 *
 * PlaqueLite is a fallback-only assembly build (301 bytes of runtime code) because Portaldot V3
 * charges the code deposit per byte. PlaqueV2 is the readable Solidity build. This suite proves
 * they agree, and that the lite build's raw-calldata interface is safe.
 *
 * Every wallet here sends at most ONE transaction: ethers reuses a pending nonce against ganache
 * when one wallet sends twice in quick succession, which once put two “contracts” at the same
 * address. One transaction per wallet removes the race completely.
 *
 * Run:  node --test tests/plaque-lite.test.mjs
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

import { BrowserProvider, ContractFactory, Wallet, Interface, getBytes, keccak256, concat, zeroPadValue } from 'ethers';
import { buildClaimDigestV2, handleKey, handleNameFromKey } from '../web/lib/plaque.js';

const lite = JSON.parse(readFileSync(new URL('../build/PlaqueLite.json', import.meta.url), 'utf8'));
const v2 = JSON.parse(readFileSync(new URL('../build/PlaqueV2.json', import.meta.url), 'utf8'));
const claimedTopic = keccak256(new TextEncoder().encode('Claimed(bytes32,address,address)'));
const PORTALDOT_CHAIN_ID = 420420777n; // the constant compiled into both contracts

const provider = new BrowserProvider(ganache.provider({ logging: { quiet: true }, wallet: { totalAccounts: 60 } }));
const [funderSigner] = await provider.listAccounts();
const funder = typeof funderSigner === 'string' ? funderSigner : await funderSigner.getAddress();

/** A new wallet with gas, so each deployment or claim is that wallet's first transaction. */
const freshWallet = async () => {
  const w = Wallet.createRandom().connect(provider);
  await provider.send('eth_sendTransaction', [
    { from: funder, to: w.address, value: '0x' + (10n ** 18n).toString(16) },
  ]);
  return w;
};

const deploy = async (artifact, signer) => {
  const c = await new ContractFactory(artifact.abi, artifact.bytecode, signer).deploy();
  await c.waitForDeployment();
  return c;
};

/** The raw calldata PlaqueLite expects: handle || who || v || r || s (5 words, no selector). */
const liteCalldata = ({ key, who, v, r, s }) =>
  concat([key, zeroPadValue(who, 32), zeroPadValue('0x' + v.toString(16), 32), r, s]);

const signFor = async (wallet, contractAddress, key) => {
  const digest = buildClaimDigestV2({
    handle: key,
    who: wallet.address,
    chainId: PORTALDOT_CHAIN_ID,
    contract: contractAddress,
  });
  const signature = await wallet.signMessage(getBytes(digest));
  return {
    digest,
    v: parseInt(signature.slice(130, 132), 16),
    r: '0x' + signature.slice(2, 66),
    s: '0x' + signature.slice(66, 130),
  };
};

const storageOwner = async (address, key) => {
  const slot = keccak256(concat([key, zeroPadValue('0x', 32)]));
  const word = await provider.getStorage(address, slot);
  return '0x' + word.slice(26);
};

test('the lite build is small, and its runtime matches the artifact', async () => {
  const deployer = await freshWallet();
  const c = await deploy(lite, deployer);
  const code = await provider.getCode(c.target);
  assert.equal(code.toLowerCase(), lite.deployedBytecode.toLowerCase());
  assert.ok((code.length - 2) / 2 <= 320, `runtime is ${(code.length - 2) / 2} bytes`);
});

test('the lite build and the Solidity build accept the same digest scheme', async () => {
  const claimant = await freshWallet();
  const liteContract = await deploy(lite, await freshWallet());
  const v2Contract = await deploy(v2, await freshWallet());
  assert.notEqual(liteContract.target, v2Contract.target, 'the two contracts have distinct addresses');

  // lite: raw calldata
  const liteKey = handleKey('shared-lite');
  const liteSig = await signFor(claimant, liteContract.target, liteKey);
  await (
    await (await freshWallet()).sendTransaction({
      to: liteContract.target,
      data: liteCalldata({ key: liteKey, who: claimant.address, ...liteSig }),
    })
  ).wait();
  assert.equal(await storageOwner(liteContract.target, liteKey), claimant.address.toLowerCase());

  // v2: the generated ABI
  const v2Key = handleKey('shared-v2');
  const v2Sig = await signFor(claimant, v2Contract.target, v2Key);
  await (
    await v2Contract.connect(await freshWallet()).claim(v2Key, claimant.address, v2Sig.v, v2Sig.r, v2Sig.s)
  ).wait();
  assert.equal(await v2Contract.ownerOf(v2Key), claimant.address);
});

test('the lite build binds the handle, emits the event, and the claimant pays nothing', async () => {
  const claimant = await freshWallet();
  const c = await deploy(lite, await freshWallet());
  const sponsor = await freshWallet();
  const key = handleKey('lite');
  const sig = await signFor(claimant, c.target, key);

  const claimantBefore = await provider.getBalance(claimant.address);
  const receipt = await (await sponsor.sendTransaction({ to: c.target, data: liteCalldata({ key, who: claimant.address, ...sig }) })).wait();
  const claimantAfter = await provider.getBalance(claimant.address);
  assert.equal(claimantAfter, claimantBefore, 'the claimant paid nothing');

  // The storage slot the dashboard reads: keccak256(handle . 0).
  assert.equal(await storageOwner(c.target, key), claimant.address.toLowerCase());

  // The event: Claimed(bytes32 indexed, address indexed, address indexed) — four topics.
  const log = receipt.logs.find((l) => l.topics[0] === claimedTopic);
  assert.ok(log, 'the Claimed event was emitted');
  assert.equal(log.topics.length, 4);
  assert.equal(log.topics[1], key);
  assert.equal('0x' + log.topics[2].slice(26), claimant.address.toLowerCase());
  assert.equal('0x' + log.topics[3].slice(26), sponsor.address.toLowerCase());
  assert.equal(log.data, '0x');
});

test('the lite build refuses: a taken handle, a wrong signer, a zero address, dirty bits, bad calldata', async () => {
  const claimant = await freshWallet();
  const c = await deploy(lite, await freshWallet());
  const sender = await freshWallet();
  const key = handleKey('taken');
  const sig = await signFor(claimant, c.target, key);

  // Every refusal is checked with a read-only call against the current state, so the test does
  // not depend on gas estimation or on a transaction being mined.
  const call = (data) => provider.call({ to: c.target, data });
  const refused = async (data, label) => {
    try {
      await call(data);
      assert.fail(`the contract accepted ${label}`);
    } catch (err) {
      if (err?.code === 'ERR_ASSERTION') throw err;
      // any revert is a refusal; a *successful* call is the failure
    }
  };

  // positive control: the same call with valid arguments succeeds
  assert.equal(await call(liteCalldata({ key, who: claimant.address, ...sig })), '0x');
  await (await sender.sendTransaction({ to: c.target, data: liteCalldata({ key, who: claimant.address, ...sig }) })).wait();
  assert.equal(await storageOwner(c.target, key), claimant.address.toLowerCase());

  // the same claim again
  await refused(liteCalldata({ key, who: claimant.address, ...sig }), 'a duplicate claim');

  // a signature by another key, claiming to be the claimant
  const other = await freshWallet();
  const otherKey = handleKey('other-signer');
  const otherSig = await signFor(other, c.target, otherKey);
  await refused(liteCalldata({ key: otherKey, who: claimant.address, ...otherSig }), 'a wrong signer');

  // the zero address
  const zeroKey = handleKey('zero');
  const zeroSig = await signFor(claimant, c.target, zeroKey);
  await refused(liteCalldata({ key: zeroKey, who: '0x' + '0'.repeat(40), ...zeroSig }), 'the zero address');

  // a word in the address slot that does not fit in 160 bits (top 12 bytes non-zero)
  const dirtyWho = '0x' + '00'.repeat(11) + '01' + claimant.address.slice(2);
  const dirtyData = concat([handleKey('dirty'), dirtyWho, zeroPadValue('0x' + zeroSig.v.toString(16), 32), zeroSig.r, zeroSig.s]);
  await refused(dirtyData, 'dirty address bits');

  // a short calldata
  await refused(concat([key, zeroPadValue(claimant.address, 32)]), 'short calldata');

  // the handle is still owned by the claimant after all the refusals
  assert.equal(await storageOwner(c.target, key), claimant.address.toLowerCase());
});

test('the lite event signature matches the one a decoder expects', async () => {
  const iface = new Interface(['event Claimed(bytes32 indexed handle, address indexed who, address indexed sponsor)']);
  assert.equal(iface.getEvent('Claimed').topicHash, claimedTopic);
  assert.equal(handleNameFromKey(handleKey('unify')), 'unify');
});
