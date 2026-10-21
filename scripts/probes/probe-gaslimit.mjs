// The Portaldot EVM needs ~1e12 gas units for a simple call (the chain's gas unit is far
// coarser than mainnet). Sending with a mainnet-sized gas limit makes the pool dry-run fail
// ("Invalid Transaction") and then ban the transaction. This tries a ladder of gas limits
// for a 0-value self-transfer on the deployer account.
import { Wallet } from 'ethers';
import { readFileSync } from 'node:fs';
import * as rpc from './rpc-lib.mjs';

const key = process.argv[2] || 'secrets/testnet.key';
const wallet = new Wallet(readFileSync(key, 'utf8').trim());
const gp = BigInt(await rpc.rpc('eth_gasPrice'));
const bal = await rpc.getBalance(wallet.address);
console.log('account:', wallet.address);
console.log('balance:', bal.toString(), 'wei | gasPrice', gp.toString());
console.log('nonce latest ', await rpc.rpc('eth_getTransactionCount', [wallet.address, 'latest']));
console.log('nonce pending', await rpc.rpc('eth_getTransactionCount', [wallet.address, 'pending']));

for (const gasLimit of [1_000_000_000_000n, 2_000_000_000_000n, 500_000_000_000n, 100_000_000_000n]) {
  if (gasLimit * gp > bal) { console.log(`gasLimit ${gasLimit}: not affordable`); continue; }
  const raw = await wallet.signTransaction({
    type: 2, chainId: 420420777, nonce: await rpc.getNonce(wallet.address),
    to: '0x0000000000000000000000000000000000000000', value: 0n,
    gasLimit, maxFeePerGas: gp, maxPriorityFeePerGas: 0n,
  });
  try {
    const hash = await rpc.rpc('eth_sendRawTransaction', [raw], { retries: 0 });
    console.log(`gasLimit ${gasLimit}: ACCEPTED ${hash}`);
    const rec = await rpc.waitForReceipt(hash, { timeoutMs: 150000, intervalMs: 3000 });
    console.log(`   mined block ${parseInt(rec.blockNumber, 16)} status ${rec.status} gasUsed ${parseInt(rec.gasUsed, 16)}`);
    break;
  } catch (e) { console.log(`gasLimit ${gasLimit}: ${e.message.slice(0, 90)}`); }
}
console.log('balance now:', (await rpc.getBalance(wallet.address)).toString());
console.log('nonce latest', await rpc.rpc('eth_getTransactionCount', [wallet.address, 'latest']));
