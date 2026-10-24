// Plaque relayer — a sponsor.
//
// The relayer watches for signed claims (POST /claim on this server) and submits them to the
// Plaque contract, paying the gas. It never sees a private key: the claim arrives already
// signed, and the contract verifies the signature itself.
//
//   node scripts/relayer.mjs [--contract Plaque] [--port 8787] [--key secrets/sponsor.key]
//
// SECURITY: the sponsor key is read from a gitignored file with 0600 permissions and is never
// written to a log, a commit or a deployment configuration.
import { createServer } from 'node:http';
import { readFileSync, existsSync, chmodSync } from 'node:fs';
import { Wallet, Interface } from 'ethers';
import * as rpc from './rpc-lib.mjs';
import { encodeLiteClaim } from '../web/lib/plaque.js';

const arg = (name, fallback) => {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};

const CONTRACT_NAME = arg('contract', 'PlaqueLite');
const PORT = Number(arg('port', '8787'));
const KEY_PATH = arg('key', 'secrets/sponsor.key');
const CHAIN_ID = 420420777;
const DEPLOYED_CONTRACT = process.env.PLAQUE_CONTRACT ?? '0x5432e6b89dc3042d47f2be98e971cad9dabab685';

if (!existsSync(KEY_PATH)) {
  console.error(`No sponsor key at ${KEY_PATH}. Create one with:`);
  console.error('  node -e "const {Wallet}=require(\'ethers\');const fs=require(\'fs\');fs.writeFileSync(\'' + KEY_PATH + '\',Wallet.createRandom().privateKey+\'\\n\',{mode:0o600})"');
  process.exit(1);
}
chmodSync(KEY_PATH, 0o600);
const sponsor = new Wallet(readFileSync(KEY_PATH, 'utf8').trim());
const artifact = JSON.parse(readFileSync(`build/${CONTRACT_NAME}.json`, 'utf8'));
const iface = new Interface(artifact.abi);

// Three builds share the same behaviour:
//   * PlaqueLite has no ABI at all: its calldata is handle || who || v || r || s (raw words);
//   * Plaque v1 takes a validity window (the contract checks it against block.timestamp);
//   * PlaqueV2 drops the window and relies on the sponsor to enforce it.
const hasClaimAbi = artifact.abi.some((e) => e.type === 'function' && e.name === 'claim');
const takesValidUntil =
  hasClaimAbi &&
  artifact.abi.some((e) => e.type === 'function' && e.name === 'claim' && e.inputs.some((i) => i.name === 'validUntil'));

const gp = await rpc.rpc('eth_gasPrice');
const balance = await rpc.getBalance(sponsor.address);
console.log(`Plaque relayer`);
console.log(`  contract build : ${CONTRACT_NAME}${takesValidUntil ? ' (with validity window)' : ' (no window)'}`);
console.log(`  sponsor        : ${sponsor.address}`);
console.log(`  balance        : ${balance.toString()} wei`);
console.log(`  gas price      : ${gp.toString()} wei`);
console.log(`  listening on   : http://127.0.0.1:${PORT}/claim\n`);

async function submit(claim) {
  const { handle, who, v, r, s, validUntil } = claim;
  if (!/^0x[0-9a-fA-F]{64}$/.test(handle)) throw new Error('bad handle');
  if (!/^0x[0-9a-fA-F]{40}$/.test(who)) throw new Error('bad address');
  if (!Number.isInteger(v) || v < 27 || v > 28) throw new Error('bad v');
  if (!/^0x[0-9a-fA-F]{64}$/.test(r) || !/^0x[0-9a-fA-F]{64}$/.test(s)) throw new Error('bad signature');
  if (takesValidUntil) {
    if (!Number.isInteger(validUntil)) throw new Error('validUntil is required for this build');
    if (Math.floor(Date.now() / 1000) > validUntil) throw new Error('the signed claim has expired');
  }

  let data;
  if (!hasClaimAbi) {
    // the lite build: no selector, five 32-byte words
    data = encodeLiteClaim({ key: handle, who, v, r, s });
  } else {
    data = iface.encodeFunctionData('claim', takesValidUntil ? [handle, who, v, r, s, validUntil] : [handle, who, v, r, s]);
  }

  const nonce = await rpc.getNonce(sponsor.address);
  // The gas limit sets this chain's storage-deposit allowance, and the pool also requires
  // balance >= gasLimit * maxFeePerGas. A claim persists one mapping entry, which this chain
  // charges ~3.84 tPOT of deposit for (measured at block 167209), so the limit is sized from the
  // sponsor's balance and the relayer refuses up front if the balance cannot cover a claim.
  const depositNeed = 4_000_000_000_000_000_000n; // 4 tPOT, just above the measured 3.87
  const balance = await rpc.getBalance(sponsor.address);
  const gasLimit = (balance * 95n) / 100n / gp;
  if (gasLimit * gp < depositNeed) {
    throw new Error(
      `the sponsor holds ${balance} wei; one claim needs ~${depositNeed} wei of storage deposit`,
    );
  }
  const raw = await sponsor.signTransaction({
    type: 2, chainId: CHAIN_ID, nonce,
    to: process.env.PLAQUE_CONTRACT ?? DEPLOYED_CONTRACT,
    value: 0n, data,
    gasLimit, maxFeePerGas: gp, maxPriorityFeePerGas: 0n,
  });
  const hash = await rpc.rpc('eth_sendRawTransaction', [raw], { retries: 0 });
  const rec = await rpc.waitForReceipt(hash, { timeoutMs: 180000, intervalMs: 3000 });
  const status = parseInt(rec.status, 16) === 1 ? 'success' : 'reverted';
  console.log(`  submitted ${hash} -> ${status} (block ${parseInt(rec.blockNumber, 16)})`);
  return { ok: status === 'success', hash, status, block: parseInt(rec.blockNumber, 16) };
}

const server = createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  if (req.method !== 'POST' || !req.url.startsWith('/claim')) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error: 'POST /claim' }));
    return;
  }
  let body = '';
  req.on('data', (c) => { body += c; if (body.length > 20000) req.destroy(); });
  req.on('end', async () => {
    try {
      const claim = JSON.parse(body || '{}');
      const out = await submit(claim);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(out));
    } catch (e) {
      const message = e instanceof Error ? e.message : 'unknown error';
      console.log('  rejected:', message);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: message }));
    }
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`ready. Send a signed claim as JSON to http://127.0.0.1:${PORT}/claim`);
});
