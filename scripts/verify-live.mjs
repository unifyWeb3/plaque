// Verify the live Plaque registry on the Portaldot V3 testnet, read-only.
//
//   node scripts/verify-live.mjs
//
// Checks, against the public RPC:
//   1. the deployed code is byte-for-byte the committed build;
//   2. the handle "unify" is bound to the zero-balance claimant in storage;
//   3. the Claimed event records the sponsor that paid;
//   4. the deployed contract accepts a valid signature and refuses a tampered one,
//      a signature for a different address, and an empty handle (eth_call, no state change).
//
// It spends nothing and changes nothing.
import { readFileSync } from 'node:fs';
import { Wallet, getBytes, keccak256, concat, zeroPadValue } from 'ethers';
import * as rpc from './rpc-lib.mjs';
import { buildClaimDigestV2, encodeLiteClaim, handleKey } from '../web/lib/plaque.js';

const CHAIN = 420420777n;
const CONTRACT = process.argv[2] ?? '0x5432e6b89dc3042d47f2be98e971cad9dabab685';
const HANDLE = process.argv[3] ?? 'unify';
const CLAIM_TOPIC = keccak256(new TextEncoder().encode('Claimed(bytes32,address,address)'));

const artifact = JSON.parse(readFileSync('build/PlaqueLite.json', 'utf8'));
const claimant = new Wallet(readFileSync(process.env.CLAIMANT_KEY || 'secrets/claimant.key', 'utf8').trim());
const sponsor = '0x064e2C32bb460Ea16A3C44A47fD9BE95CAbD4fD5';

let failures = 0;
const check = (ok, label, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`);
  if (!ok) failures += 1;
};

const block = parseInt(await rpc.rpc('eth_blockNumber'), 16);
const code = await rpc.rpc('eth_getCode', [CONTRACT, 'latest']);
const codeHash = keccak256(code);
const buildHash = keccak256(artifact.deployedBytecode);
console.log(`Plaque live verification - block ${block}\n`);
check(code.toLowerCase() === artifact.deployedBytecode.toLowerCase(), 'deployed code equals the committed build',
  `${(code.length - 2) / 2} bytes, keccak ${codeHash.slice(0, 18)}...`);

// the binding in storage
const key = handleKey(HANDLE);
const slot = keccak256(concat([key, zeroPadValue('0x', 32)]));
const word = await rpc.rpc('eth_getStorageAt', [CONTRACT, slot, 'latest']);
const owner = '0x' + word.slice(-40);
check(owner.toLowerCase() === claimant.address.toLowerCase(), `ownerOf("${HANDLE}") is the zero-balance claimant`,
  owner);
check((await rpc.getBalance(claimant.address)) === 0n, 'the claimant still holds 0 wei');

// the event
const logs = await rpc.rpc('eth_getLogs', [{
  address: CONTRACT,
  fromBlock: '0x0',
  toBlock: '0x' + block.toString(16),
  topics: [CLAIM_TOPIC],
}]);
const claimLog = (logs || []).find((l) => l.topics?.[1] === key);
check(Boolean(claimLog), 'the Claimed event is on chain', claimLog ? `block ${parseInt(claimLog.blockNumber, 16)}` : '');
if (claimLog) {
  const eventWho = '0x' + claimLog.topics[2].slice(26);
  const eventSponsor = '0x' + claimLog.topics[3].slice(26);
  check(eventWho.toLowerCase() === claimant.address.toLowerCase(), 'the event names the claimant as `who`');
  check(eventSponsor.toLowerCase() === sponsor.toLowerCase(), 'the event names the sponsor that paid');
  console.log(`        tx ${claimLog.transactionHash}`);
  console.log(`        explorer https://node-console.portaldot.dev`);
}

// the verification path, exercised against live state with eth_call (nothing is written)
const freshKey = handleKey('verify-live');
const digest = buildClaimDigestV2({ handle: freshKey, who: claimant.address, chainId: CHAIN, contract: CONTRACT });
const signature = await claimant.signMessage(getBytes(digest));
const v = parseInt(signature.slice(130, 132), 16);
const r = '0x' + signature.slice(2, 66);
const s = '0x' + signature.slice(66, 130);
const data = (key, who, vv, rr, ss) => encodeLiteClaim({ key, who, v: vv, r: rr, s: ss });
const call = (d) => rpc.rpc('eth_call', [{ from: sponsor, to: CONTRACT, data: d }, 'latest']);
const refused = async (d) => {
  try {
    await call(d);
    return false;
  } catch {
    return true;
  }
};
await call(data(freshKey, claimant.address, v, r, s));
check(true, 'a valid signature is accepted (eth_call)');
check(await refused(data(freshKey, claimant.address, v, '0x' + 'ab'.repeat(32), s)), 'a tampered signature is refused');
check(await refused(data(freshKey, '0x' + '11'.repeat(20), v, r, s)), 'a signature for another address is refused');
check(await refused(data(zeroPadValue('0x', 32), claimant.address, v, r, s)), 'an empty handle is refused');

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'}`);
process.exit(failures === 0 ? 0 : 1);
