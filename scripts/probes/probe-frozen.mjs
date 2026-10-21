// Is the deployer account frozen? Check the Substrate-side AccountInfo for our accounts.
import { ApiPromise, WsProvider } from '@polkadot/api';

const provider = new WsProvider(process.env.PORTALDOT_WS || 'wss://test-node-v3.portaldot.dev', 4000);
const api = await ApiPromise.create({ provider });
const accounts = {
  'deployer (eth-derived)': '5Hkx9RshKpqfvttQFTc5Ze7JbuunB6FP488X3eBzGPY9WYTf',
  'sr25519 identity': '5EerrCZjEuNc3nypCUDLfvSyKLtJfzuKvQQx9DSCeeUFABoy',
  '//Alice': '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
  'new sponsor': '5CCyNDUw1Xkhn6PZEMFA2sT1BpJE8idttobEYGRndUAMyABS',
};
for (const [name, ss58] of Object.entries(accounts)) {
  const acc = await api.query.system.account(ss58);
  console.log(name, ss58);
  console.log('   ', JSON.stringify(acc.data ? acc.data.toHuman() : acc.toHuman()).slice(0, 320));
}
const alice = await api.query.system.account('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY');
console.log('\nalice data detail:', JSON.stringify(alice.data?.toHuman()));
await api.disconnect();
process.exit(0);
