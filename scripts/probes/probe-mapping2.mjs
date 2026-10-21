// 1) Is EVM address == truncation of the Substrate AccountId32?
// 2) Is revive.mapAccount permissionless (can a normal key bind an EVM address to its own account)?
import { ApiPromise, WsProvider } from '@polkadot/api';
import { decodeAddress, encodeAddress } from '@polkadot/util-crypto';

const provider = new WsProvider(process.env.PORTALDOT_WS || 'wss://test-node-v3.portaldot.dev', 2000);
const api = await ApiPromise.create({ provider });

const map = [];
for (const [k, v] of await api.query.revive.originalAccount.entries()) map.push([k.args[0].toString(), v.toString()]);

let trunc = 0, padded = 0, other = 0;
for (const [eth, ss58] of map) {
  const raw = decodeAddress(ss58);          // 32-byte AccountId32
  const hex = Buffer.from(raw).toString('hex');
  const addr = '0x' + hex.slice(0, 40);
  if (addr === eth.toLowerCase()) trunc++;
  else if ('0x' + hex.slice(24) === eth.toLowerCase()) padded++;
  else other++;
}
console.log(`mapping relation over ${map.length} entries -> truncation(first20)=${trunc} padded(last20)=${padded} other=${other}`);

console.log('\n--- system.account balances for 3 mapped substrate accounts ---');
for (const [eth, ss58] of map.slice(0, 3)) {
  const acc = await api.query.system.account(ss58);
  const info = await api.query.revive.accountInfoOf(eth);
  console.log(`  eth=${eth} ss58=${ss58}`);
  console.log(`    system.account data=${acc.data ? acc.data.toHuman() : JSON.stringify(acc.toHuman()).slice(0, 120)}`);
  console.log(`    revive.accountInfoOf=${JSON.stringify(info.toHuman()).slice(0, 200)}`);
}

console.log('\n--- system.account entries count + funded ---');
const sysAcc = await api.query.system.account.entries();
const funded = sysAcc.filter(([, v]) => v.data && v.data.free.toBigInt() > 0n);
console.log('system.account entries:', sysAcc.length, 'funded:', funded.length);
for (const [k, v] of funded.slice(0, 8)) {
  console.log(`   ${k.args[0].toString()} free=${v.data.free.toString()} nonce=${v.data.nonce}`);
}

await api.disconnect();
process.exit(0);
