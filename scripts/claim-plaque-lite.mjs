// A live sponsored claim against PlaqueLite on the Portaldot V3 testnet.
//
//   node scripts/claim-plaque-lite.mjs <contract> <handle>
//
// The claimant holds ZERO tPOT and never sends a transaction: it signs the claim off chain.
// The sponsor submits the signed claim and pays the gas. The contract recovers the signature
// itself, so the sponsor cannot bind the handle to anybody else's address.
//
// PlaqueLite has no ABI: its calldata is `handle || who || v || r || s`, five 32-byte words.
import { Wallet, getBytes, keccak256, concat, zeroPadValue } from 'ethers';
import { readFileSync, writeFileSync } from 'node:fs';
import * as rpc from './rpc-lib.mjs';
import { buildClaimDigestV2, handleKey, handleNameFromKey } from '../web/lib/plaque.js';

const CHAIN = 420420777n;
const contract = process.argv[2];
const name = process.argv[3];
if (!contract || !name) {
  console.error('usage: node scripts/claim-plaque-lite.mjs <contract> <handle>');
  process.exit(1);
}

const claimant = new Wallet(readFileSync(process.env.CLAIMANT_KEY || 'secrets/claimant.key', 'utf8').trim());
const sponsor = new Wallet(readFileSync(process.env.SPONSOR_KEY || 'secrets/sponsor.key', 'utf8').trim());
const key = handleKey(name);
const gp = BigInt(await rpc.rpc('eth_gasPrice'));

console.log(`handle   ${handleNameFromKey(key)}  (${key})`);
console.log(`claimant ${claimant.address}  balance ${await rpc.getBalance(claimant.address)} wei`);
console.log(`sponsor  ${sponsor.address}  balance ${await rpc.getBalance(sponsor.address)} wei`);

// 1. the claimant signs the claim - off chain, no transaction, no gas
const digest = buildClaimDigestV2({ handle: key, who: claimant.address, chainId: CHAIN, contract });
const signature = await claimant.signMessage(getBytes(digest));
const v = parseInt(signature.slice(130, 132), 16);
const r = '0x' + signature.slice(2, 66);
const s = '0x' + signature.slice(66, 130);
console.log(`\nsigned   digest ${digest}`);
console.log(`         signature ${signature.slice(0, 22)}...${signature.slice(-10)} (v=${v})`);

// 2. the sponsor submits it and pays
const data = concat([key, zeroPadValue(claimant.address, 32), zeroPadValue('0x' + v.toString(16), 32), r, s]);
const raw = await sponsor.signTransaction({
  type: 2, chainId: CHAIN, nonce: await rpc.getNonce(sponsor.address),
  to: contract, value: 0n, data,
  // The gas limit also sets the storage-deposit allowance of the transaction, and the pool
  // requires balance >= gasLimit * maxFeePerGas. The write persists one mapping entry, which
  // costs a storage deposit on this chain, so the limit is set as high as the sponsor's
  // balance allows.
  gasLimit: (await rpc.getBalance(sponsor.address)) * 95n / 100n / gp, maxFeePerGas: gp, maxPriorityFeePerGas: 0n,
});
const hash = await rpc.rpc('eth_sendRawTransaction', [raw], { retries: 0 });
console.log(`\nsponsor  tx ${hash}`);
const rec = await rpc.waitForReceipt(hash, { timeoutMs: 240000, intervalMs: 3000 });
const ok = parseInt(rec.status, 16) === 1;
console.log(`         block ${parseInt(rec.blockNumber, 16)} status ${ok ? 'SUCCESS' : 'FAILED'} gasUsed ${parseInt(rec.gasUsed, 16)}`);

// 3. read the result back from the chain
const slot = keccak256(concat([key, zeroPadValue('0x', 32)]));
const word = await rpc.rpc('eth_getStorageAt', [contract, slot, 'latest']);
const owner = '0x' + word.slice(-40);
const claimantAfter = await rpc.getBalance(claimant.address);
const claimedTopic = keccak256(new TextEncoder().encode('Claimed(bytes32,address,address)'));
const log = (rec.logs || []).find((l) => l.topics[0] === claimedTopic);
console.log(`\nstorage  slot ${slot}`);
console.log(`         keccak256(handle || 0) = ${word}`);
console.log(`         owner = ${owner}  ${owner.toLowerCase() === claimant.address.toLowerCase() ? '(the signer)' : '(MISMATCH)'}`);
console.log(`claimant balance after: ${claimantAfter} wei  ${claimantAfter === 0n ? '(still zero: it paid nothing)' : ''}`);
if (log) {
  console.log(`event    Claimed  handle ${log.topics[1]}`);
  console.log(`         who ${log.topics[2]}  sponsor ${log.topics[3]}`);
  console.log(`         the sponsor recorded on chain is this sponsor: ${'0x' + log.topics[3].slice(26) === sponsor.address.toLowerCase()}`);
} else {
  console.log('event    NO CLAIMED LOG FOUND');
}
console.log(`\nexplorer https://node-console.portaldot.dev`);

const evidence = {
  contract, handle: handleNameFromKey(key), key, tx: hash,
  block: parseInt(rec.blockNumber, 16), status: ok ? 'SUCCESS' : 'FAILED',
  gasUsed: parseInt(rec.gasUsed, 16), digest, signature,
  claimant: claimant.address, claimantBalanceAfter: claimantAfter.toString(),
  sponsor: sponsor.address, storageSlot: slot, storageWord: word, owner,
  event: log ? { topics: log.topics, data: log.data } : null,
};
const out = `evidence/claim-lite-${handleNameFromKey(key)}.json`;
writeFileSync(out, JSON.stringify(evidence, null, 2));
console.log(`evidence written to ${out}`);
if (!ok || owner.toLowerCase() !== claimant.address.toLowerCase()) process.exit(1);
