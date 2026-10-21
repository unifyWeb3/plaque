// Probe: how does ganache report a custom-error revert?
import ganache from 'ganache';
import { BrowserProvider, ContractFactory, Wallet } from 'ethers';
import { readFileSync } from 'node:fs';

const art = JSON.parse(readFileSync('/root/hack/build/Plaque.json', 'utf8'));
const provider = new BrowserProvider(ganache.provider({ logging: { quiet: true } }));
const [f] = await provider.listAccounts();
const funder = typeof f === 'string' ? f : await f.getAddress();
const w = Wallet.createRandom().connect(provider);
await provider.send('eth_sendTransaction', [{ from: funder, to: w.address, value: '0x' + (10n ** 18n).toString(16) }]);
const c = await new ContractFactory(art.abi, art.bytecode, await provider.getSigner()).deploy();
await c.waitForDeployment();

const key = '0x' + '11'.repeat(32);
const args = [key, w.address, 27, '0x' + '22'.repeat(32), '0x' + '33'.repeat(32), 99999999999n];
await (await c.claim(...args)).wait();
console.log('ownerOf:', await c.ownerOf(key));

try {
  await c.claim.staticCall(...args);
  console.log('staticCall: NO REVERT (unexpected)');
} catch (e) {
  console.log('staticCall revert:', e.revert?.name, '| short:', e.shortMessage, '| data:', e.data);
  if (e.data) {
    try { console.log('  decoded:', c.interface.parseError(e.data).name); } catch (err) { console.log('  decode failed:', err.message.slice(0, 100)); }
  }
}

const data = c.interface.encodeFunctionData('claim', args);
try {
  const raw = await provider.send('eth_call', [{ to: c.target, data }, 'latest']);
  console.log('eth_call: no revert', raw);
} catch (e) {
  console.log('eth_call error:', e.shortMessage);
  console.log('  info.error:', JSON.stringify(e.info?.error).slice(0, 300));
}
