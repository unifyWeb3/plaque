// POT distribution across all accounts on the Portaldot V3 testnet.
import { ApiPromise, WsProvider } from '@polkadot/api';

const provider = new WsProvider(process.env.PORTALDOT_WS || 'wss://test-node-v3.portaldot.dev', 4000);
const api = await ApiPromise.create({ provider });
const entries = await api.query.system.account.entries();
let total = 0n, funded = 0, count = entries.length;
const rows = [];
for (const [k, v] of entries) {
  if (!v.data) continue;
  const f = v.data.free.toBigInt();
  total += f;
  if (f > 0n) { funded++; rows.push([k.args[0].toString(), f]); }
}
rows.sort((a, b) => (b[1] > a[1] ? 1 : -1));
const t = (n) => (n / 100000000000000n).toString() + ' tPOT';
console.log('accounts:', count, '| funded:', funded);
console.log('total free:', total.toString(), 'native =', t(total));
console.log('\ntop 12 by balance:');
for (const [a, f] of rows.slice(0, 12)) console.log('  ', a, f.toString(), '=', t(f));
const buckets = { '<1': 0, '1-10': 0, '10-100': 0, '>100': 0 };
for (const [, f] of rows) {
  const p = f / 100000000000000n;
  if (p < 1n) buckets['<1']++; else if (p < 10n) buckets['1-10']++; else if (p < 100n) buckets['10-100']++; else buckets['>100']++;
}
console.log('\ndistribution by tPOT:', JSON.stringify(buckets));
const issuance = await api.query.balances.totalIssuance();
console.log('totalIssuance:', issuance.toString(), 'native =', t(issuance.toBigInt()));
await api.disconnect();
process.exit(0);
