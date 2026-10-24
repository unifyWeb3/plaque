// Plaque relayer — a sponsor.
//
// The relayer accepts a signed claim (POST /claim on this server) and submits it to the Plaque
// contract, paying the gas. It never sees a claimant private key: the claim arrives already
// signed, and the contract verifies the signature itself.
//
//   node scripts/relayer.mjs [--contract PlaqueLite] [--port 8787] [--key secrets/sponsor.key]
//
// SECURITY: the sponsor key is read from a gitignored file with 0600 permissions and is never
// written to a log, a commit or a deployment configuration. The server binds to 127.0.0.1 and
// rejects browser origins other than the local dashboard; it is a local demo, not a public
// service. A fixed gas limit and a small queue cap bound the spend per request.
import { createServer } from 'node:http';
import { readFileSync, existsSync, chmodSync, statSync } from 'node:fs';
import { Wallet, Interface, concat, keccak256, zeroPadValue, getBytes, verifyMessage } from 'ethers';
import * as rpc from './rpc-lib.mjs';
import config from '../config/plaque.json' with { type: 'json' };
import { buildClaimDigest, buildClaimDigestV2, encodeLiteClaim } from '../web/lib/plaque.js';
import { claimGasLimit, validateLiteClaim } from './relayer-lib.mjs';
import { createSponsorPolicy, loadPolicyConfig } from './relayer-policy.mjs';

const arg = (name, fallback) => {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};

const CONTRACT_NAME = arg('contract', 'PlaqueLite');
const PORT = Number(arg('port', '8787'));
const KEY_PATH = arg('key', 'secrets/sponsor.key');
const CHAIN_ID = BigInt(config.chainId);
const CONTRACT = process.env.PLAQUE_CONTRACT ?? config.contract;
const ALLOWED_ORIGINS = (process.env.PLAQUE_SPONSOR_ORIGINS ??
  'http://127.0.0.1:3000,http://localhost:3000').split(',').map((s) => s.trim()).filter(Boolean);
const MAX_PENDING = 4;
const POLICY_PATH = arg('policy', process.env.PLAQUE_POLICY ?? 'config/relayer-policy.json');
const policy = createSponsorPolicy({ config: loadPolicyConfig(POLICY_PATH) });

if (!existsSync(KEY_PATH)) {
  console.error(`No sponsor key at ${KEY_PATH}. Create one with:`);
  console.error('  node -e "const {Wallet}=require(\'ethers\');const fs=require(\'fs\');fs.writeFileSync(\'' + KEY_PATH + '\',Wallet.createRandom().privateKey+\'\\n\',{mode:0o600})"');
  process.exit(1);
}
if ((statSync(KEY_PATH).mode & 0o777) !== 0o600) chmodSync(KEY_PATH, 0o600);
const sponsor = new Wallet(readFileSync(KEY_PATH, 'utf8').trim());
const artifact = JSON.parse(readFileSync(`build/${CONTRACT_NAME}.json`, 'utf8'));
const iface = new Interface(artifact.abi);

// Three builds share the same behaviour:
//   * PlaqueLite has no ABI: calldata is handle || who || v || r || s (raw words);
//   * Plaque v1 takes a validity window (the contract checks it against block.timestamp);
//   * PlaqueV2 drops the window and relies on the sponsor to enforce its policy.
const hasClaimAbi = artifact.abi.some((e) => e.type === 'function' && e.name === 'claim');
const takesValidUntil =
  hasClaimAbi &&
  artifact.abi.some((e) => e.type === 'function' && e.name === 'claim' && e.inputs.some((i) => i.name === 'validUntil'));

const rpcChain = BigInt(await rpc.rpc('eth_chainId'));
if (rpcChain !== CHAIN_ID) {
  console.error(`Refusing to run: the RPC reports chain ${rpcChain}, config says ${CHAIN_ID}.`);
  process.exit(1);
}
const deployedCode = await rpc.getCode(CONTRACT);
if (!deployedCode || deployedCode === '0x') {
  console.error(`Refusing to run: no contract code at ${CONTRACT} on chain ${CHAIN_ID}.`);
  process.exit(1);
}
const gp = BigInt(await rpc.rpc('eth_gasPrice'));
const startBalance = await rpc.getBalance(sponsor.address);
console.log(`Plaque relayer`);
console.log(`  contract build : ${CONTRACT_NAME}${takesValidUntil ? ' (with validity window)' : ' (no window)'}`);
console.log(`  contract       : ${CONTRACT}`);
console.log(`  sponsor        : ${sponsor.address}`);
console.log(`  balance        : ${startBalance.toString()} wei`);
console.log(`  gas price      : ${gp.toString()} wei`);
console.log(`  policy         : ip ${policy.config.perIp.max}/${policy.config.perIp.windowMs}ms, ` +
  `owner ${policy.config.perOwner.max}/${policy.config.perOwner.windowMs}ms, ` +
  `global ${policy.config.global.maxClaims} claims / ${policy.config.global.maxSpendWei} wei`);
console.log(`  listening on   : http://127.0.0.1:${PORT}/claim\n`);

/** Serialize submissions so two requests cannot race on the same sponsor nonce. */
let queue = Promise.resolve();
const enqueue = (fn) => {
  const p = queue.then(fn, fn);
  queue = p.then(() => undefined, () => undefined);
  return p;
};

async function submit(claim, policy) {
  let data;
  if (!hasClaimAbi) {
    ({ data } = validateLiteClaim(claim, { chainId: CHAIN_ID, contract: CONTRACT }));
  } else {
    const { handle, who, v, r, s, validUntil } = claim ?? {};
    if (typeof handle !== 'string' || !/^0x[0-9a-fA-F]{64}$/.test(handle)) throw new Error('bad handle');
    if (typeof who !== 'string' || !/^0x[0-9a-fA-F]{40}$/.test(who)) throw new Error('bad address');
    if (!Number.isInteger(v) || v < 27 || v > 28) throw new Error('bad v');
    if (typeof r !== 'string' || !/^0x[0-9a-fA-F]{64}$/.test(r)) throw new Error('bad r');
    if (typeof s !== 'string' || !/^0x[0-9a-fA-F]{64}$/.test(s)) throw new Error('bad s');
    if (takesValidUntil) {
      if (!Number.isInteger(validUntil)) throw new Error('validUntil is required for this build');
      if (Math.floor(Date.now() / 1000) > validUntil) throw new Error('the signed claim has expired');
    }
    const digest = takesValidUntil
      ? buildClaimDigest({ handle, who, chainId: CHAIN_ID, contract: CONTRACT, validUntil })
      : buildClaimDigestV2({ handle, who, chainId: CHAIN_ID, contract: CONTRACT });
    const signature = `0x${r.slice(2)}${s.slice(2)}${v.toString(16).padStart(2, '0')}`;
    let recovered;
    try {
      recovered = verifyMessage(getBytes(digest), signature);
    } catch {
      throw new Error('invalid signature');
    }
    if (recovered.toLowerCase() === '0x0000000000000000000000000000000000000000') {
      throw new Error('signature recovered the zero address');
    }
    if (recovered.toLowerCase() !== who.toLowerCase()) {
      throw new Error('signature does not match who');
    }
    data = iface.encodeFunctionData('claim', takesValidUntil
      ? [handle, who, v, r, s, validUntil]
      : [handle, who, v, r, s]);
  }

  // Refuse a known-taken handle before spending gas. The contract is still the authority; this
  // only avoids paying for a predictable revert.
  const slot = keccak256(concat([claim.handle, zeroPadValue('0x', 32)]));
  const word = await rpc.rpc('eth_getStorageAt', [CONTRACT, slot, 'latest']);
  if (BigInt(word) !== 0n) throw new Error('handle already owned');

  const gasPrice = BigInt(await rpc.rpc('eth_gasPrice'));
  const balance = await rpc.getBalance(sponsor.address);
  const gasLimit = claimGasLimit({ gasPrice, balance, reserveWei: policy.config.minBalanceWei });
  const reservation = policy.reserve({ costWei: gasLimit * gasPrice, balanceWei: balance });
  if (!reservation.ok) {
    const e = new Error(reservation.reason);
    e.statusCode = 429;
    throw e;
  }
  try {
    const nonce = await rpc.getNonce(sponsor.address);
    const raw = await sponsor.signTransaction({
      type: 2, chainId: CHAIN_ID, nonce,
      to: CONTRACT,
      value: 0n, data,
      gasLimit, maxFeePerGas: gasPrice, maxPriorityFeePerGas: 0n,
    });
    const hash = await rpc.rpc('eth_sendRawTransaction', [raw], { retries: 0 });
    const rec = await rpc.waitForReceipt(hash, { timeoutMs: 180000, intervalMs: 3000 });
    const status = parseInt(rec.status, 16) === 1 ? 'success' : 'reverted';
    policy.commit(reservation);
    console.log(`  submitted ${hash} -> ${status} (block ${parseInt(rec.blockNumber, 16)})`);
    return { ok: status === 'success', hash, status, block: parseInt(rec.blockNumber, 16) };
  } catch (e) {
    policy.release(reservation);
    throw e;
  }
}

let pending = 0;
const server = createServer((req, res) => {
  const origin = req.headers.origin;
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error: 'origin not allowed' }));
    return;
  }
  res.setHeader('Access-Control-Allow-Origin', origin ?? ALLOWED_ORIGINS[0]);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  if (req.method !== 'POST' || !req.url.startsWith('/claim')) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error: 'POST /claim' }));
    return;
  }
  if (pending >= MAX_PENDING) {
    res.writeHead(429, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error: 'busy; try again' }));
    return;
  }
  pending += 1;
  let body = '';
  req.on('data', (c) => { body += c; if (body.length > 20000) req.destroy(); });
  req.on('end', async () => {
    try {
      const claim = JSON.parse(body || '{}');
      const admitted = policy.admit({
        ip: req.socket.remoteAddress ?? 'unknown',
        origin: origin ?? 'cli',
        owner: claim?.who ?? 'unknown',
      });
      if (!admitted.ok) {
        res.writeHead(429, { 'Content-Type': 'application/json', 'Retry-After': String(Math.ceil((admitted.retryAfterMs ?? 1000) / 1000)) });
        res.end(JSON.stringify({ ok: false, error: admitted.reason, retryAfterMs: admitted.retryAfterMs }));
        return;
      }
      const out = await enqueue(() => submit(claim, policy));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(out));
    } catch (e) {
      const message = e instanceof Error ? e.message : 'unknown error';
      console.log('  rejected:', message);
      res.writeHead(e?.statusCode ?? 400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: message }));
    } finally {
      pending -= 1;
    }
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`ready. Send a signed claim as JSON to http://127.0.0.1:${PORT}/claim`);
});
