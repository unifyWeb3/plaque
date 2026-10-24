// Verify the live Plaque registry on the Portaldot V3 testnet, read-only.
//
//   node scripts/verify-live.mjs
//
// No secret and no funds are required: the signature matrix uses a fresh ephemeral key and
// eth_call from the public sponsor address. Ten checks, all against one pinned block.
import { readFileSync, existsSync } from 'node:fs';
import { Wallet, getBytes, keccak256, concat, zeroPadValue } from 'ethers';
import * as rpc from './rpc-lib.mjs';
import { buildClaimDigestV2, encodeLiteClaim, handleKey } from '../web/lib/plaque.js';
import config from '../config/plaque.json' with { type: 'json' };
import { validateConfig } from './config-lib.mjs';

validateConfig(config);
const CONTRACT = process.argv[2] ?? config.contract;
const HANDLE = process.argv[3] ?? config.handle;
const CHAIN = BigInt(config.chainId);
const CLAIM_TOPIC = keccak256(new TextEncoder().encode(config.eventSignature));
const ARTIFACT = 'build/PlaqueLite.json';

if (!existsSync(ARTIFACT)) {
  console.error(`missing ${ARTIFACT}; run "npm run compile" first (README section 6)`);
  process.exit(2);
}
const artifact = JSON.parse(readFileSync(ARTIFACT, 'utf8'));

/** Strip the Solidity CBOR metadata suffix, which embeds the build source path. */
function runtimeOnly(code) {
  const buf = Buffer.from(String(code).replace(/^0x/, ''), 'hex');
  if (buf.length < 4) return '0x' + buf.toString('hex');
  const n = buf.readUInt16BE(buf.length - 2);
  if (n <= 0 || n + 2 > buf.length) return '0x' + buf.toString('hex');
  return '0x' + buf.subarray(0, buf.length - 2 - n).toString('hex');
}

let failures = 0;
const check = (ok, label, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`);
  if (!ok) failures += 1;
};

const chainId = await rpc.rpc('eth_chainId');
if (BigInt(chainId) !== CHAIN) {
  console.error(`Refusing to verify: RPC chain ${BigInt(chainId)} != config chain ${CHAIN}`);
  process.exit(2);
}
const block = parseInt(await rpc.rpc('eth_blockNumber'), 16);
const code = await rpc.rpc('eth_getCode', [CONTRACT, 'latest']);
const codeHash = keccak256(code);
const buildHash = keccak256(artifact.deployedBytecode);
console.log(`Plaque live verification - block ${block}`);
console.log(`chain id ${parseInt(chainId, 16)}  contract ${CONTRACT}\n`);

const rawEqual = code.toLowerCase() === artifact.deployedBytecode.toLowerCase();
check(rawEqual, 'deployed code equals the committed build',
  `${(code.length - 2) / 2} bytes, keccak ${codeHash.slice(0, 18)}...`);
const normEqual = runtimeOnly(code) === runtimeOnly(artifact.deployedBytecode);
console.log(`        normalized runtime ${(runtimeOnly(code).length - 2) / 2} bytes, ` +
  `keccak ${keccak256(runtimeOnly(code)).slice(0, 18)}... equal=${normEqual}`);
if (!normEqual) failures += 1;

// The binding in storage. The expected claimant is the address named by the on-chain event;
// it is also pinned in config so a wrong contract cannot pass.
const key = handleKey(HANDLE);
const slot = keccak256(concat([key, zeroPadValue('0x', 32)]));
const word = await rpc.rpc('eth_getStorageAt', [CONTRACT, slot, '0x' + block.toString(16)]);
const owner = '0x' + word.slice(-40);
check(owner.toLowerCase() === config.claimant.toLowerCase(),
  `ownerOf("${HANDLE}") is the zero-balance claimant`, owner);
check((await rpc.getBalance(config.claimant)) === 0n, 'the claimant still holds 0 wei');

// The event.
const logs = await rpc.rpc('eth_getLogs', [{
  address: CONTRACT,
  fromBlock: '0x' + config.deployBlock.toString(16),
  toBlock: '0x' + block.toString(16),
  topics: [CLAIM_TOPIC],
}]);
const claimLog = (logs || []).find((l) => l.topics?.[1] === key);
check(Boolean(claimLog), 'the Claimed event is on chain',
  claimLog ? `block ${parseInt(claimLog.blockNumber, 16)}` : '');
if (claimLog) {
  const eventWho = '0x' + claimLog.topics[2].slice(26);
  const eventSponsor = '0x' + claimLog.topics[3].slice(26);
  check(eventWho.toLowerCase() === config.claimant.toLowerCase(), 'the event names the claimant as `who`');
  check(eventSponsor.toLowerCase() === config.sponsor.toLowerCase(), 'the event names the sponsor that paid');
  console.log(`        tx ${claimLog.transactionHash}`);
  console.log(`        explorer ${config.explorer}`);
}

// The verification path, exercised against live state with eth_call (nothing is written).
// A fresh ephemeral wallet is enough: the contract must accept its signature and refuse variants.
const ephemeral = Wallet.createRandom();
const freshKey = handleKey('verify-' + ephemeral.address.slice(2, 10));
const digest = buildClaimDigestV2({
  handle: freshKey,
  who: ephemeral.address,
  chainId: CHAIN,
  contract: CONTRACT,
});
const signature = await ephemeral.signMessage(getBytes(digest));
const v = parseInt(signature.slice(130, 132), 16);
const r = '0x' + signature.slice(2, 66);
const s = '0x' + signature.slice(66, 130);
const data = (who, vv, rr, ss) => encodeLiteClaim({ key: freshKey, who, v: vv, r: rr, s: ss });
const call = (d) => rpc.rpc('eth_call', [{ from: config.sponsor, to: CONTRACT, data: d }, '0x' + block.toString(16)]);
const refused = async (d) => {
  try {
    await call(d);
    return false;
  } catch {
    return true;
  }
};
await call(data(ephemeral.address, v, r, s));
check(true, 'a valid signature is accepted (eth_call)');
check(await refused(data(ephemeral.address, v, '0x' + 'ab'.repeat(32), s)), 'a tampered signature is refused');
check(await refused(data('0x' + '11'.repeat(20), v, r, s)), 'a signature for another address is refused');
check(await refused(data(zeroPadValue('0x', 32), v, r, s)), 'a zero address is refused');

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'}`);
process.exit(failures === 0 ? 0 : 1);
