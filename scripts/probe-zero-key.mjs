// Read-only probe of the zero-handle boundary on the live PlaqueLite contract.
//
//   node scripts/probe-zero-key.mjs
//
// No secret, no key file and no transaction: every call is eth_call at one pinned block. The
// point is to separate two different things that were previously conflated:
//   * a zero ADDRESS (`who == 0`) is refused by the contract;
//   * an invalid signature (ecrecover returns 0) is refused because 0 != who;
//   * a zero HANDLE with a valid signature and a non-zero `who` is accepted by the contract.
import { Wallet, getBytes, keccak256, concat, zeroPadValue } from 'ethers';
import * as rpc from './rpc-lib.mjs';
import { buildClaimDigestV2, encodeLiteClaim, handleKey } from '../web/lib/plaque.js';
import config from '../config/plaque.json' with { type: 'json' };

const CHAIN = BigInt(config.chainId);
const CONTRACT = config.contract;
const block = parseInt(await rpc.rpc('eth_blockNumber'), 16);
const blockTag = '0x' + block.toString(16);

const sign = async (who, handle) => {
  const digest = buildClaimDigestV2({ handle, who: who.address, chainId: CHAIN, contract: CONTRACT });
  const sig = await who.signMessage(getBytes(digest));
  return { v: parseInt(sig.slice(130, 132), 16), r: '0x' + sig.slice(2, 66), s: '0x' + sig.slice(66, 130) };
};
const data = (key, who, sig) => encodeLiteClaim({ key, who, v: sig.v, r: sig.r, s: sig.s });
const call = (d) => rpc.rpc('eth_call', [{ from: config.sponsor, to: CONTRACT, data: d }, blockTag]);
const refused = async (d) => { try { await call(d); return false; } catch { return true; } };
let failures = 0;
const check = (ok, label, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`);
  if (!ok) failures += 1;
};

console.log(`Plaque zero-key probe - block ${block}`);
console.log(`chain id ${parseInt(await rpc.rpc('eth_chainId'), 16)}  contract ${CONTRACT}\n`);

const who = Wallet.createRandom();
const normalKey = handleKey('zero-probe-' + who.address.slice(2, 8));
const normalSig = await sign(who, normalKey);
const normalData = data(normalKey, who.address, normalSig);
await call(normalData);
check(true, 'positive control: a valid non-zero claim is accepted (eth_call)');

const zeroKey = '0x' + '0'.repeat(64);
const zeroSig = await sign(who, zeroKey);
const zeroData = data(zeroKey, who.address, zeroSig);
const zeroSlot = keccak256(concat([zeroKey, zeroPadValue('0x', 32)]));
const before = await rpc.rpc('eth_getStorageAt', [CONTRACT, zeroSlot, blockTag]);
let zeroAccepted = false;
try { await call(zeroData); zeroAccepted = true; } catch {}
check(zeroAccepted, 'zero HANDLE with a valid signature is ACCEPTED by the contract (eth_call; no tx)',
  'owner would be the signer, not the zero address');
const after = await rpc.rpc('eth_getStorageAt', [CONTRACT, zeroSlot, blockTag]);
check(before === after, 'eth_call did not persist state (the zero slot is still empty)', after);

const badSig = { ...normalSig, r: '0x' + 'ab'.repeat(32) };
check(await refused(data(normalKey, who.address, badSig)), 'invalid signature is refused (ecrecover mismatch)');
check(await refused(data(normalKey, '0x' + '0'.repeat(40), normalSig)), 'zero ADDRESS is refused by the contract');
const other = Wallet.createRandom();
check(await refused(data(normalKey, who.address, await sign(other, normalKey))), 'signature for another owner is refused');

console.log(`\n${failures === 0 ? 'ALL EXPECTED BEHAVIOUR CONFIRMED' : failures + ' PROBE(S) FAILED'}`);
process.exit(failures === 0 ? 0 : 1);
