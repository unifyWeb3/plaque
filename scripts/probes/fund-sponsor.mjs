// Fund the fresh sponsor from //Alice with an amount that clears the existential deposit
// (0.1 tPOT) and the fee. Alice's spendable balance is small, so try a few amounts.
import { ApiPromise, WsProvider } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';
import { cryptoWaitReady, encodeAddress } from '@polkadot/util-crypto';
import { Wallet } from 'ethers';
import { readFileSync } from 'node:fs';

await cryptoWaitReady();
const keyring = new Keyring({ type: 'sr25519', ss58Format: 42 });
const alice = keyring.addFromUri('//Alice');
const sponsor = new Wallet(readFileSync('secrets/sponsor.key', 'utf8').trim());
const ethAcct = Buffer.concat([Buffer.from(sponsor.address.slice(2), 'hex'), Buffer.alloc(12, 0xee)]);
const dst = encodeAddress(ethAcct, 42);

const provider = new WsProvider(process.env.PORTALDOT_WS || 'wss://test-node-v3.portaldot.dev', 4000);
const api = await ApiPromise.create({ provider });

for (const amount of [20_000_000_000_000n, 50_000_000_000_000n, 100_000_000_000_000n]) {
  const acc = await api.query.system.account(dst);
  const free = acc.data ? acc.data.free.toBigInt() : 0n;
  if (free > 0n) { console.log('already funded:', free.toString()); break; }
  let err = null;
  try {
    await api.tx.balances.transferAllowDeath(ethAcct, amount).signAndSend(alice, ({ status, txHash, dispatchError }) => {
      if (dispatchError) err = dispatchError.toString();
      if (status.isInBlock || status.isFinalized) console.log('  tx', txHash.toString(), status.type, err ?? 'ok');
    });
    await new Promise((r) => setTimeout(r, 10000));
  } catch (e) { console.log('  threw:', e.message.slice(0, 120)); }
  const after = await api.query.system.account(dst);
  const free2 = after.data ? after.data.free.toBigInt() : 0n;
  console.log(`amount ${amount}: sponsor free = ${free2.toString()}${err ? ' err=' + err : ''}`);
  if (free2 > 0n) break;
}
await api.disconnect();
process.exit(0);
