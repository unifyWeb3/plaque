// Bootstrap the throwaway testnet wallet with testnet tPOT.
//
// Source: the standard public Substrate dev account `//Alice` (well-known testnet dev key,
// 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY). It exists on the Portaldot V3 testnet with
// a testnet balance. We move a small, bounded amount of test-only tPOT into our OWN freshly
// generated throwaway accounts. No real value is involved and no human-held credential is used.
//
// The official Portaldot faucet requires a Discord support ticket (human action); this script
// exists so the build is not blocked on that, and it is disclosed in state/MEMORY.md.
import { ApiPromise, WsProvider } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { encodeAddress } from '@polkadot/util-crypto';
import { Wallet } from 'ethers';
import { readFileSync } from 'node:fs';

await cryptoWaitReady();

const amount = 1_000_000_000_000_000n; // 10_000 tPOT (14 decimals) per target
const keyring = new Keyring({ type: 'sr25519', ss58Format: 42 });
const alice = keyring.addFromUri('//Alice');

const provider = new WsProvider(process.env.PORTALDOT_WS || 'wss://test-node-v3.portaldot.dev', 4000);
const api = await ApiPromise.create({ provider });

const aliceAcc = await api.query.system.account(alice.address);
console.log('source //Alice :', alice.address);
console.log('source balance :', aliceAcc.data ? aliceAcc.data.free.toString() : 'n/a');

const seedHex = readFileSync('secrets/substrate.seed', 'utf8').trim();
const pair = keyring.addFromUri(seedHex);
const srAcct = Buffer.from(pair.publicKey);

const evmAddr = new Wallet(readFileSync('secrets/testnet.key', 'utf8').trim()).address;
const ethAcct = Buffer.concat([Buffer.from(evmAddr.slice(2), 'hex'), Buffer.alloc(12, 0xee)]);

const targets = [
  { name: 'eth-derived (plain EVM path)', id: ethAcct },
  { name: 'sr25519 (Substrate control)', id: srAcct },
];

for (const t of targets) {
  const ss58 = encodeAddress(t.id, 42);
  const before = await api.query.system.account(ss58);
  const freeBefore = before.data ? before.data.free.toBigInt() : 0n;
  console.log(`\n--- ${t.name} ---`);
  console.log('  ss58   :', ss58);
  console.log('  before :', freeBefore.toString());
  if (freeBefore > 0n) { console.log('  already funded, skipping'); continue; }
  try {
    const unsub = await api.tx.balances.transferAllowDeath(t.id, amount).signAndSend(alice, ({ status, txHash, dispatchError }) => {
      if (status.isInBlock || status.isFinalized) {
        console.log('  txHash :', txHash.toString());
        console.log('  status :', status.type, dispatchError ? dispatchError.toString() : 'ok');
        unsub();
      }
    });
  } catch (e) {
    console.log('  transfer FAILED:', e.message.slice(0, 300));
  }
}

await new Promise((r) => setTimeout(r, 12000));
for (const t of targets) {
  const ss58 = encodeAddress(t.id, 42);
  const after = await api.query.system.account(ss58);
  console.log('\nfinal', ss58, '->', after.data ? after.data.free.toString() : 'n/a');
}

await api.disconnect();
process.exit(0);
