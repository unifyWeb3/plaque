// Generic deployer for the Portaldot V3 testnet EVM.
//
//   node scripts/deploy-any.mjs <artifactName>
//
// The chain charges a storage deposit that is proportional to the code size, and it derives the
// storage-deposit limit from the transaction's gas limit, so the gas limit is computed from the
// balance and the measured cost per byte. The script fails closed if that window is empty.
import { Wallet, keccak256 } from 'ethers';
import { readFileSync, writeFileSync } from 'node:fs';
import * as rpc from './rpc-lib.mjs';

import config from '../config/plaque.json' with { type: 'json' };
const CHAIN = config.chainId;
const name = process.argv[2];
if (!name) { console.error('usage: node scripts/deploy-any.mjs <artifactName>'); process.exit(1); }

const sponsor = new Wallet(readFileSync(process.env.SPONSOR_KEY || 'secrets/testnet.key', 'utf8').trim());
const artifact = JSON.parse(readFileSync(`build/${name}.json`, 'utf8'));
const gp = BigInt(await rpc.rpc('eth_gasPrice'));
const balance = await rpc.getBalance(sponsor.address);
const codeBytes = BigInt((artifact.deployedBytecode.length - 2) / 2);

// Measured on this chain (two deployments and the failed probes): the code deposit is
//   deposit(wei) = 18.4 tPOT + 0.0713 tPOT per byte of deployed code,
// and the node derives its storage-deposit limit from `gasLimit * maxFeePerGas`. So the gas
// limit has to be large enough to cover the deposit, while the pool also requires
// `balance >= gasLimit * maxFeePerGas`. Both constraints are applied below; the window is
// empty when the account genuinely cannot deploy this contract.
const TPOT = 10n ** 18n;
const depositWei = 18_400_000_000_000_000_000n + 71_300_000_000_000_000n * codeBytes;
const minGas = (depositWei * 102n) / 100n / gp;   // 2% above the deposit
const maxGas = (balance * 99n) / 100n / gp;       // the pool's own balance requirement
console.log(`  estimated code deposit: ${depositWei / TPOT} tPOT (${codeBytes} bytes)`);
console.log(`${name}: codeBytes=${codeBytes} balance=${balance} gasPrice=${gp}`);
console.log(`  gas window: ${minGas} .. ${maxGas}`);
if (minGas >= maxGas) { console.log('FATAL: the balance cannot cover this deployment'); process.exit(1); }
const override = process.env.GAS_LIMIT ? BigInt(process.env.GAS_LIMIT) : null;
const gasLimit = override && override < maxGas ? override : (minGas + maxGas) / 2n;

const raw = await sponsor.signTransaction({
  type: 2, chainId: CHAIN, nonce: await rpc.getNonce(sponsor.address),
  to: null, value: 0n, data: artifact.bytecode,
  gasLimit, maxFeePerGas: gp, maxPriorityFeePerGas: 0n,
});
const hash = await rpc.rpc('eth_sendRawTransaction', [raw], { retries: 0 });
console.log('tx:', hash);
const rec = await rpc.waitForReceipt(hash, { timeoutMs: 240000, intervalMs: 3000 });
const ok = parseInt(rec.status, 16) === 1;
console.log('block:', parseInt(rec.blockNumber, 16), 'status:', ok ? 'SUCCESS' : 'FAILED', 'gasUsed:', parseInt(rec.gasUsed, 16));
if (!ok) { console.log('deployment reverted'); process.exit(1); }
const address = rec.contractAddress;
const onChain = await rpc.getCode(address);
console.log('contract:', address);
console.log('bytecode identical to fresh compile:', onChain.toLowerCase() === artifact.deployedBytecode.toLowerCase());
console.log('keccak on-chain  :', keccak256(onChain));
console.log('keccak fresh build:', keccak256(artifact.deployedBytecode));
const after = await rpc.getBalance(sponsor.address);
console.log('cost:', ((balance - after) / 10n ** 18n).toString(), 'tPOT | balance now:', (after / 10n ** 18n).toString(), 'tPOT');
writeFileSync(`build/${name}-deploy.json`, JSON.stringify({
  contract: address, tx: hash, block: parseInt(rec.blockNumber, 16), gasUsed: rec.gasUsed,
  bytecodeIdentical: onChain.toLowerCase() === artifact.deployedBytecode.toLowerCase(),
  keccakOnchain: keccak256(onChain), keccakFresh: keccak256(artifact.deployedBytecode),
  costWei: (balance - after).toString(), compiler: artifact.compiler,
}, null, 2));
console.log('\nstorage slot 0 (chainid):', await rpc.rpc('eth_getStorageAt', [address, '0x0', 'latest']));
