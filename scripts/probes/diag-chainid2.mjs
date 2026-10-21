// Send the claim with different chainId values in the digest and see which the contract accepts.
import { Wallet, Interface, getBytes } from 'ethers';
import { readFileSync } from 'node:fs';
import * as rpc from './rpc-lib.mjs';
import { buildClaimDigest, handleKey } from '../web/lib/plaque.js';
const address = '0xa0e58d0c6392048959c0b16a9d3696fe49d063d6';
const sponsor = new Wallet(readFileSync('secrets/testnet.key', 'utf8').trim());
const claimant = new Wallet(readFileSync('secrets/claimant.key', 'utf8').trim());
const artifact = JSON.parse(readFileSync('build/Plaque.json', 'utf8'));
const iface = new Interface(artifact.abi);
const gp = BigInt(await rpc.rpc('eth_gasPrice'));
const key = handleKey('unify');
for (const chainId of [420420777, 42, 1, 0, 1337, 2, 100, 31337, 7879, 1284]) {
  const validUntil = Math.floor(Date.now() / 1000) + 3600;
  const digest = buildClaimDigest({ handle: key, who: claimant.address, chainId, contract: address, validUntil });
  const sig = await claimant.signMessage(getBytes(digest));
  const v = parseInt(sig.slice(130, 132), 16);
  const data = iface.encodeFunctionData('claim', [key, claimant.address, v, '0x' + sig.slice(2, 66), '0x' + sig.slice(66, 130), validUntil]);
  const raw = await sponsor.signTransaction({
    type: 2, chainId: 420420777, nonce: await rpc.getNonce(sponsor.address),
    to: address, value: 0n, data, gasLimit: 1_500_000_000_000n,
    maxFeePerGas: gp, maxPriorityFeePerGas: 0n,
  });
  try {
    const hash = await rpc.rpc('eth_sendRawTransaction', [raw], { retries: 0 });
    const rec = await rpc.waitForReceipt(hash, { timeoutMs: 150000, intervalMs: 3000 });
    const ok = parseInt(rec.status, 16) === 1;
    console.log(`chainId ${chainId}: ${ok ? 'SUCCESS' : 'reverted'} block ${parseInt(rec.blockNumber, 16)} logs ${rec.logs.length}`);
    if (ok) { console.log('  tx', hash); break; }
  } catch (e) { console.log(`chainId ${chainId}: ${e.message.slice(0, 100)}`); }
}
