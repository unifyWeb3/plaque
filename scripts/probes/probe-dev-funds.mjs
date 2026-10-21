// Look for any *public* dev-account derivation that holds a testnet balance on Portaldot V3.
// Only well-known public dev seeds are checked; no private key material is involved.
import { ApiPromise, WsProvider } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';

await cryptoWaitReady();
const keyring = new Keyring({ type: 'sr25519', ss58Format: 42 });
const provider = new WsProvider(process.env.PORTALDOT_WS || 'wss://test-node-v3.portaldot.dev', 4000);
const api = await ApiPromise.create({ provider });

const seeds = [
  '//Alice', '//Bob', '//Charlie', '//Dave', '//Eve', '//Ferdie',
  '//Alice_stash', '//Bob_stash', '//Charlie_stash', '//Dave_stash', '//Eve_stash', '//Ferdie_stash',
  '//Alice//stash', '//Bob//stash', '//Charlie//stash', '//Dave//stash', '//Eve//stash', '//Ferdie//stash',
  '//Alice/0', '//Alice/1', '//Bob/0', '//Bob/1',
  '//Treasury', '//Faucet', '//Stash', '//Authority',
];
let found = 0;
for (const s of seeds) {
  let addr;
  try { addr = keyring.addFromUri(s).address; } catch { continue; }
  const acc = await api.query.system.account(addr);
  const free = acc.data ? acc.data.free.toBigInt() : 0n;
  if (free > 0n) { found++; console.log(`FUNDED ${s.padEnd(18)} ${addr} free=${free.toString()} native = ${(free / 100000000000000n).toString()} tPOT`); }
  else console.log(`        ${s.padEnd(18)} ${addr} 0`);
}
console.log('funded public dev accounts found:', found);
await api.disconnect();
process.exit(0);
