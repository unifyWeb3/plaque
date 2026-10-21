import { ApiPromise, WsProvider } from '@polkadot/api';
const provider = new WsProvider(process.env.PORTALDOT_WS || 'wss://test-node-v3.portaldot.dev', 4000);
const api = await ApiPromise.create({ provider });
for (const k of Object.keys(api.consts.balances || {})) {
  try { console.log('balances.' + k, '=', api.consts.balances[k].toString()); } catch {}
}
const ed = api.consts.balances?.existentialDeposit;
console.log('ED =', ed ? ed.toString() : 'n/a', ed ? '= ' + (Number(ed.toString())/1e14).toFixed(3) + ' tPOT' : '');
for (const k of Object.keys(api.consts.system || {})) {
  if (/existential|minimum/i.test(k)) console.log('system.' + k, '=', api.consts.system[k].toString());
}
await api.disconnect(); process.exit(0);
