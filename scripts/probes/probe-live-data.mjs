// Which Portaldot-specific pallets have live data on the V3 testnet?
// This decides which Portaldot-native capability a product can actually demonstrate.
import { ApiPromise, WsProvider } from '@polkadot/api';

const provider = new WsProvider(process.env.PORTALDOT_WS || 'wss://test-node-v3.portaldot.dev', 4000);
const api = await ApiPromise.create({ provider });

async function show(label, fn) {
  try {
    const v = await fn();
    const s = v?.toHuman ? v.toHuman() : v;
    const j = JSON.stringify(s);
    console.log(`${label}: ${j === undefined ? 'undefined' : j.slice(0, 400)}`);
  } catch (e) { console.log(`${label}: ERR ${e.message.slice(0, 100)}`); }
}

await show('mixnet.mixnodes', () => api.query.mixnet.mixnodes());
await show('mixnet.nextAuthorityIds', () => api.query.mixnet.nextAuthorityIds());
await show('mixnet.currentSessionIndex', () => api.query.mixnet.currentSessionIndex());
await show('mixnet.currentSessionStartBlock', () => api.query.mixnet.currentSessionStartBlock());
await show('broker.leases', () => api.query.broker.leases());
await show('broker.configuration', () => api.query.broker.configuration());
await show('broker.regions', () => api.query.broker.regions());
await show('broker.revenueInbox', () => api.query.broker.revenueInbox());
await show('broker.coreCountInbox', () => api.query.broker.coreCountInbox());
await show('oracle.values', () => api.query.oracle.values());
await show('oracle.rawValues', () => api.query.oracle.rawValues());
await show('parameters.parameters', () => api.query.parameters.parameters());
await show('assets.asset(1)', () => api.query.assets.asset(1));
await show('assets.asset(2)', () => api.query.assets.asset(2));
await show('assets.nextAssetId', () => api.query.assets.nextAssetId());
await show('uniques.class(1)', () => api.query.uniques.class(1));
await show('nfts.nextItemId', () => api.query.nfts.nextItemId());
await show('statement.calls', () => api.query.statement.calls());
await show('transactionStorage.transactionCount', () => api.query.transactionStorage.transactionCount());
await show('transactionStorage.transactionByIndex(0)', () => api.query.transactionStorage.transactionByIndex(0));
await show('staking.erasStakers(0)', () => api.query.staking.erasStakers(0));
await show('staking.currentEra', () => api.query.staking.currentEra());
await show('session.validators', () => api.query.session.validators());
await show('identity.identityOf(alice)', () => api.query.identity.identityOf('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'));
await show('bounties.bounties', () => api.query.bounties.bounties());
await show('lottery.lottery', () => api.query.lottery.lottery());
await show('multisig.multisigs', () => api.query.multisig.multisigs());
await show('scheduler.tasks', () => api.query.scheduler.tasks());
await show('txPause.paCalls', () => api.query.txPause.paCalls());
await show('safeMode.safeMode', () => api.query.safeMode.safeMode());
await show('statement', () => api.query.statement.calls());

await api.disconnect();
process.exit(0);
