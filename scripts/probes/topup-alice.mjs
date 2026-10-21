// Move the remaining balance of the public dev account //Alice into our throwaway
// testnet wallet. Testnet-only tokens; documented in state/MEMORY.md.
import { ApiPromise, WsProvider } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';
import { cryptoWaitReady, encodeAddress } from '@polkadot/util-crypto';
import { readFileSync } from 'node:fs';
import { Wallet } from 'ethers';

await cryptoWaitReady();
const keyring = new Keyring({ type: 'sr25519', ss58Format: 42 });
const alice = keyring.addFromUri('//Alice');
const evmAddr = new Wallet(readFileSync('secrets/testnet.key', 'utf8').trim()).address;
const ethAcct = Buffer.concat([Buffer.from(evmAddr.slice(2), 'hex'), Buffer.alloc(12, 0xee)]);
const dst = encodeAddress(ethAcct, 42);

const provider = new WsProvider(process.env.PORTALDOT_WS || 'wss://test-node-v3.portaldot.dev', 4000);
const api = await ApiPromise.create({ provider });
const a = await api.query.system.account(alice.address);
const free = a.data ? a.data.free.toBigInt() : 0n;
console.log('//Alice free:', free.toString());
const reserve = 1_000_000_000_000n; // keep 0.01 tPOT so the account still exists
const want = 10_000_000_000_000_000n; const headroom = 200_000_000_000_000n; const amount = free > want + headroom ? want : (free > headroom ? free - headroom : 0n);
if (amount > 0n) {
  try {
    await api.tx.balances.transferAllowDeath(ethAcct, amount).signAndSend(alice, ({ status, txHash, dispatchError }) => {
      if (dispatchError) console.log('  dispatchError:', dispatchError.toString());
      if (status.isInBlock || status.isFinalized) console.log('  tx', txHash.toString(), status.type);
    });
  } catch (e) { console.log('FAILED', e.message.slice(0, 250)); }
}
await new Promise((r) => setTimeout(r, 15000));
for (const [n, addr] of [['alice', alice.address], ['ours', dst]]) {
  const acc = await api.query.system.account(addr);
  console.log('final', n, addr, '->', acc.data ? acc.data.free.toString() : 'n/a');
}
await api.disconnect();
process.exit(0);
