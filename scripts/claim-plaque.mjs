// Claim handles on the deployed Plaque contract with a zero-balance wallet, sponsored by the
// deployer, and write the full evidence file.
//
//   node scripts/claim-plaque.mjs <contractAddress> <deployTxHash> <handle[,handle...]>
import { Wallet, Interface, keccak256, getBytes } from 'ethers';
import { readFileSync, writeFileSync, existsSync, chmodSync } from 'node:fs';
import * as rpc from './rpc-lib.mjs';
import { buildClaimDigest, handleKey, weiToPot, PORTALDOT } from '../web/lib/plaque.js';

import config from '../config/plaque.json' with { type: 'json' };
const CHAIN = config.chainId;
const address = process.argv[2];
const deployTx = process.argv[3];
const handles = (process.argv[4] || 'unify').split(',');
if (!address || !deployTx) {
  console.error('usage: node scripts/claim-plaque.mjs <contract> <deployTx> <handles>');
  process.exit(1);
}

const log = (...a) => console.log(...a);
const sponsor = new Wallet(readFileSync(process.env.SPONSOR_KEY || 'secrets/testnet.key', 'utf8').trim());
const CLAIMANT_KEY = 'secrets/claimant.key';
if (!existsSync(CLAIMANT_KEY)) {
  const w = Wallet.createRandom();
  writeFileSync(CLAIMANT_KEY, w.privateKey + '\n', { mode: 0o600 });
  chmodSync(CLAIMANT_KEY, 0o600);
}
const claimant = new Wallet(readFileSync(CLAIMANT_KEY, 'utf8').trim());

const artifact = JSON.parse(readFileSync('build/Plaque.json', 'utf8'));
const iface = new Interface(artifact.abi);
const gp = BigInt(await rpc.rpc('eth_gasPrice'));

// ---------- deploy evidence (re-read from the chain) ----------
let drec = await rpc.getReceipt(deployTx);
let prior = {};
try { prior = JSON.parse(readFileSync('build/Plaque-deployment.json', 'utf8')); } catch { /* first run */ }
if (!drec) {
  // The public node prunes receipts aggressively; fall back to the evidence recorded at deploy time.
  if (!prior.deployTx) { log('FATAL: no receipt for', deployTx); process.exit(1); }
  log('note: the node no longer serves the deployment receipt; using the recorded evidence');
  drec = { blockNumber: '0x' + prior.deployBlock.toString(16), status: '0x1', gasUsed: prior.deployGasUsed };
}
const deployBlock = parseInt(drec.blockNumber, 16);
const onChain = await rpc.getCode(address);
const identical = onChain.toLowerCase() === artifact.deployedBytecode.toLowerCase();
log('deploy tx   :', deployTx);
log('deploy block:', deployBlock, '| status:', parseInt(drec.status, 16) === 1 ? 'SUCCESS' : 'FAILED');
log('contract    :', address, '| code bytes:', (onChain.length - 2) / 2, '| identical to fresh compile:', identical);
log('keccak      :', keccak256(onChain), '==', keccak256(artifact.deployedBytecode));

// ---------- sponsored claims ----------
const claims = [];
for (const h of handles) {
  const key = handleKey(h);
  const validUntil = Math.floor(Date.now() / 1000) + 3600;
  const digest = buildClaimDigest({
    handle: key, who: claimant.address, chainId: CHAIN, contract: address, validUntil,
  });
  const sig = await claimant.signMessage(getBytes(digest));
  const r = '0x' + sig.slice(2, 66);
  const s = '0x' + sig.slice(66, 130);
  const v = parseInt(sig.slice(130, 132), 16);

  const beforeClaimant = await rpc.getBalance(claimant.address);
  const tx = await sponsor.signTransaction({
    type: 2, chainId: CHAIN, nonce: await rpc.getNonce(sponsor.address),
    to: address, value: 0n,
    data: iface.encodeFunctionData('claim', [key, claimant.address, v, r, s, validUntil]),
    gasLimit: 1_000_000_000_000n, // the Portaldot EVM needs a coarse gas limit
    maxFeePerGas: gp, maxPriorityFeePerGas: 0n,
  });
  let hash;
  try {
    hash = await rpc.rpc('eth_sendRawTransaction', [tx], { retries: 2 });
  } catch (e) {
    log(`claim "${h}" FAILED: ${e.message}`);
    continue;
  }
  const crec = await rpc.waitForReceipt(hash, { timeoutMs: 180000, intervalMs: 3000 });
  const status = parseInt(crec.status, 16) === 1 ? 'SUCCESS' : 'FAILED';
  const parsed = crec.logs.map((l) => { try { return iface.parseLog(l); } catch { return null; } }).filter(Boolean);
  const claimed = parsed.find((p) => p.name === 'Claimed');
  const afterClaimant = await rpc.getBalance(claimant.address);
  log(`\nclaim "${h}"`);
  log('  tx            :', hash);
  log('  block         :', parseInt(crec.blockNumber, 16), '| status:', status, '| gasUsed:', parseInt(crec.gasUsed, 16));
  log('  event         :', claimed ? `${claimed.name}(${claimed.args.map(String).join(', ')})` : 'NONE');
  log('  claimant POT  : before', weiToPot(beforeClaimant), '| after', weiToPot(afterClaimant), '(unchanged:', beforeClaimant === afterClaimant, ')');
  claims.push({
    handle: h, key, tx: hash, block: parseInt(crec.blockNumber, 16), status,
    gasUsed: crec.gasUsed,
    event: claimed ? {
      name: claimed.name,
      who: claimed.args.who,
      sponsor: claimed.args.sponsor,
      gasPrice: claimed.args.gasPrice.toString(),
    } : null,
    claimantBalanceBefore: beforeClaimant.toString(),
    claimantBalanceAfter: afterClaimant.toString(),
  });
}

// ---------- pinned state ----------
const pin = Math.max(deployBlock, ...claims.map((c) => c.block));
const state = [];
for (const c of claims) {
  const owner = await rpc.rpc('eth_call', [
    { to: address, data: iface.encodeFunctionData('ownerOf', [c.key]) }, '0x' + pin.toString(16),
  ]);
  const ownerLatest = await rpc.rpc('eth_call', [
    { to: address, data: iface.encodeFunctionData('ownerOf', [c.key]) }, 'latest',
  ]);
  state.push({ handle: c.handle, key: c.key, owner, ownerAtLatest: ownerLatest, atBlock: pin });
  log(`state @block ${pin}: ${c.handle} -> ${owner}`);
}

const summary = {
  product: 'Plaque',
  chain: PORTALDOT.name,
  chainId: CHAIN,
  rpc: PORTALDOT.rpc,
  explorer: PORTALDOT.explorer,
  contract: address,
  deployTx,
  deployBlock,
  deployGasUsed: drec.gasUsed,
  sponsor: sponsor.address,
  claimant: claimant.address,
  claimantBalancePOT: weiToPot(await rpc.getBalance(claimant.address)),
  bytecode: {
    onchainBytes: (onChain.length - 2) / 2,
    artifactBytes: (artifact.deployedBytecode.length - 2) / 2,
    identical,
    keccakOnchain: keccak256(onChain),
    keccakFreshCompile: keccak256(artifact.deployedBytecode),
  },
  compiler: artifact.compiler,
  claims,
  pinnedState: { block: pin, entries: state },
  sponsorBalancePOT: weiToPot(await rpc.getBalance(sponsor.address)),
  head: await rpc.blockNumber(),
};
writeFileSync('build/Plaque-deployment.json', JSON.stringify(summary, null, 2));
log('\n' + JSON.stringify(summary, null, 2));
