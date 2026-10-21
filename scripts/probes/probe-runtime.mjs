// Definitive runtime inspection through the typed Substrate API.
import { ApiPromise, WsProvider } from '@polkadot/api';

const provider = new WsProvider(process.env.PORTALDOT_WS || 'wss://test-node-v3.portaldot.dev', 2000);
const api = await ApiPromise.create({ provider });

console.log('runtime spec:', api.runtimeVersion.specName.toString(), 'specVersion', api.runtimeVersion.specVersion.toNumber());
console.log('chain:', api.runtimeChain.toString());
console.log('tokenDecimals:', api.registry.chainDecimals, 'tokenSymbol:', api.registry.chainTokens);

const md = api.registry.metadata;
const pallets = md.pallets || (md.asLatest && md.asLatest.pallets) || [];

console.log('\n--- pallets: index, name, storage items ---');
for (const p of pallets) {
  let items = [];
  try {
    const st = p.storage;
    if (st) {
      const raw = st.items;
      items = raw instanceof Map ? [...raw.values()].map((i) => i.name.toString())
        : Array.isArray(raw) ? raw.map((i) => i.name.toString()) : [];
    }
  } catch { /* ignore */ }
  console.log(`[${p.index.toNumber()}] ${p.name.toString()}${items.length ? ' :: ' + items.join(', ') : ''}`);
}

console.log('\n--- tx calls of interest ---');
for (const key of ['ethereum', 'evm', 'revive', 'contracts', 'system', 'balances', 'sudo', 'faucet', 'assets', 'metaTx', 'broker']) {
  const mod = api.tx[key];
  if (mod) console.log(key, '->', Object.keys(mod).filter((k) => typeof mod[k] === 'function').join(', '));
}

console.log('\n--- query of interest ---');
for (const key of ['ethereum', 'evm', 'revive', 'contracts', 'system', 'balances', 'faucet', 'assets', 'metaTx', 'broker', 'parameters', 'oracle', 'mixnet']) {
  const mod = api.query[key];
  if (mod) console.log(key, '->', Object.keys(mod).filter((k) => typeof mod[k] === 'function').join(', '));
}

await api.disconnect();
process.exit(0);
