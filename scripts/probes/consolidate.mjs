// Move testnet POT from the sr25519 account into the eth-derived (EVM signer) account
// so the deployment budget sits in one place.
import { ApiPromise, WsProvider } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';
import { cryptoWaitReady, encodeAddress } from '@polkadot/util-crypto';
import { readFileSync } from 'node:fs';
import { Wallet } from 'ethers';

await cryptoWaitReady();
const keyring = new Keyring({ type: 'sr25519', ss58Format: 42 });
const pair = keyring.addFromUri(readFileSync('secrets/substrate.seed', 'utf8').trim());
const evmAddr = new Wallet(readFileSync('secrets/testnet.key', 'utf8').trim()).address;
const ethAcct = Buffer.concat([Buffer.from(evmAddr.slice(2), 'hex'), Buffer.alloc(12, 0xee)]);

const provider = new WsProvider(process.env.PORTALDOT_WS || 'wss://test-node-v3.portaldot.dev', 4000);
const api = await ApiPromise.create({ provider });

const src = pair.address;
const dst = encodeAddress(ethAcct, 42);
const srcAcc = await api.query.system.account(src);
const dstAcc = await api.query.system.account(dst);
console.log('src', src, srcAcc.data ? srcAcc.data.free.toString() : 'n/a');
console.log('dst', dst, dstAcc.data ? dstAcc.data.free.toString() : 'n/a');

const amount = srcAcc.data.free.toBigInt() - 10_000_000_000_000n; // leave dust
if (amount <= 0n) { console.log('nothing to move'); process.exit(0); }
try {
  await api.tx.balances.transferAllowDeath(ethAcct, amount).signAndSend(pair, ({ status, txHash, dispatchError }) => {
    if (dispatchError) console.log('  dispatchError:', dispatchError.toString());
    if (status.isInBlock || status.isFinalized) console.log('  tx', txHash.toString(), status.type);
  });
} catch (e) { console.log('FAILED', e.message.slice(0, 300)); }

await new Promise((r) => setTimeout(r, 15000));
for (const [n, a] of [['src', src], ['dst', dst]]) {
  const acc = await api.query.system.account(a);
  console.log('final', n, a, '->', acc.data ? acc.data.free.toString() : 'n/a');
}
await api.disconnect();
process.exit(0);
