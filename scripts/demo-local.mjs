// End-to-end demonstration of the Plaque mechanic on a local chain (ganache).
//
//   node scripts/demo-local.mjs
//
// What it shows, in order:
//   1. a wallet with ZERO balance signs a claim for a handle;
//   2. a *sponsor* (a different wallet, the only one that holds gas) submits it and pays;
//   3. the handle is bound to the signer, and the event log records the sponsor and the gas price;
//   4. the signer's balance is still exactly zero;
//   5. a second claim for the same handle is refused, with the positive control already in place.
//
// This runs on ganache because the Portaldot V3 runtime cannot execute the BLOCK-family opcodes
// (see state/CHAIN-LIMITATION.md). The contract used here is the chain-compatible build
// (contracts/PlaqueV2.sol): the same source that is ready to deploy to Portaldot once the testnet
// wallet has the ~71 tPOT the code deposit costs.
//
// This is a LOCAL CHAIN. Nothing here is presented as Portaldot testnet state.
import { BrowserProvider, Wallet, ContractFactory, Interface, AbiCoder, getBytes, keccak256, concat, zeroPadValue } from 'ethers';
import { readFileSync } from 'node:fs';
import { handleKey, handleNameFromKey } from '../web/lib/plaque.js';

const ganacheModule = await import('ganache');
const ganacheProvider = ganacheModule.provider ?? ganacheModule.default.provider;
const artifact = JSON.parse(readFileSync('build/PlaqueV2.json', 'utf8'));
const iface = new Interface(artifact.abi);
const CHAIN_ID = 420420777n; // the constant inside PlaqueV2.sol

const eip1193 = ganacheProvider({
  logging: { quiet: true },
  wallet: { totalAccounts: 4, defaultBalance: 1000 },
});
const provider = new BrowserProvider(eip1193);
const initial = await eip1193.getInitialAccounts();
const [sponsorAddress, claimantAddress] = Object.keys(initial);
const claimant = new Wallet(initial[claimantAddress].secretKey); // off-chain signer only

const show = (label, value) => console.log(`   ${label.padEnd(26)} ${value}`);

console.log('Plaque - the sponsored write, end to end on a local chain\n');

// The claimant starts with nothing: this is the whole point of the product.
await provider.send('evm_setAccountBalance', [claimantAddress, '0x0']);
await provider.send('evm_mine', []);

console.log('accounts');
show('sponsor (pays gas)', `${sponsorAddress}  ${(await provider.getBalance(sponsorAddress)) / 10n ** 18n} ETH (local)`);
show('claimant (pays nothing)', `${claimantAddress}  ${(await provider.getBalance(claimantAddress)) / 10n ** 18n} ETH (local)`);
console.log('');

// Deploy the chain-compatible build from the sponsor's account.
const sponsorSigner = await provider.getSigner(sponsorAddress);
const contract = await new ContractFactory(artifact.abi, artifact.bytecode, sponsorSigner).deploy();
await contract.waitForDeployment();
const address = contract.target;
const code = await provider.getCode(address);
console.log('contract');
show('address', address);
show('bytecode', `${(code.length - 2) / 2} bytes`);
show('matches the artifact', code.toLowerCase() === artifact.deployedBytecode.toLowerCase());
console.log('');

// 1. The claimant signs. No transaction, no gas, no balance.
const name = 'unify';
const key = handleKey(name);
const abi = AbiCoder.defaultAbiCoder();
const digest = keccak256(
  abi.encode(
    ['bytes32', 'bytes32', 'bytes32', 'bytes32', 'bytes32'],
    [
      '0x' + (1n).toString(16).padStart(64, '0'),
      key,
      '0x' + BigInt(claimant.address).toString(16).padStart(64, '0'),
      '0x' + CHAIN_ID.toString(16).padStart(64, '0'),
      '0x' + BigInt(address).toString(16).padStart(64, '0'),
    ],
  ),
);
console.log(`1. the claimant signs a claim for "${name}" (an off-chain signature, no gas)`);
show('handle key', key);
show('digest', digest);
const signature = await claimant.signMessage(getBytes(digest));
const v = parseInt(signature.slice(130, 132), 16);
const r = '0x' + signature.slice(2, 66);
const s = '0x' + signature.slice(66, 130);
show('signature', `${signature.slice(0, 20)}...${signature.slice(-8)}`);
console.log('');

// 2. The sponsor submits it and pays.
console.log('2. the sponsor submits the signed claim and pays the gas');
const claimantBefore = await provider.getBalance(claimantAddress);
const sponsorBefore = await provider.getBalance(sponsorAddress);
const tx = await contract.connect(sponsorSigner).claim(key, claimant.address, v, r, s);
const receipt = await tx.wait();
const claimantAfter = await provider.getBalance(claimantAddress);
const sponsorAfter = await provider.getBalance(sponsorAddress);
const logs = receipt.logs
  .map((l) => {
    try {
      return iface.parseLog(l);
    } catch {
      return null;
    }
  })
  .filter(Boolean);
const claimed = logs.find((p) => p.name === 'Claimed');
show('transaction', receipt.hash);
show('block', receipt.blockNumber);
show('gas used', receipt.gasUsed.toString());
show('event', `Claimed(handle="${handleNameFromKey(claimed.args.handle)}", who=${claimed.args.who},`);
show('', `sponsor=${claimed.args.sponsor}, gasPrice=${claimed.args.gasPrice})`);
show('sponsor paid', `${sponsorBefore - sponsorAfter} wei (gas)`);
show('claimant paid', `${claimantBefore - claimantAfter} wei`);
console.log('');

// 3. The binding is on chain, and the claimant still holds nothing.
const owner = await contract.ownerOf(key);
console.log('3. the registry, read back from the chain');
show(`ownerOf("${name}")`, owner);
show('equals the signer', owner.toLowerCase() === claimant.address.toLowerCase());
show('claimant balance', `${claimantAfter} wei  <- unchanged`);
console.log('');

// 4. A refused claim, with the positive control above.
console.log('4. a second claim for the same handle is refused');
try {
  await contract.connect(sponsorSigner).claim.staticCall(key, claimant.address, v, r, s);
  console.log('   UNEXPECTED: the contract accepted a duplicate claim');
  process.exitCode = 1;
} catch (err) {
  let label = err?.shortMessage ?? String(err);
  try {
    const decoded = iface.parseError(err?.data ?? err?.info?.error?.data);
    if (decoded) label = `${decoded.name}()`;
  } catch {
    /* keep the short message */
  }
  show('refusal', label);
}
show(`ownerOf("${name}") still`, await contract.ownerOf(key));
console.log('');

const slot = keccak256(concat([key, zeroPadValue('0x', 32)]));
console.log(`storage slot of the binding: keccak256(handle || 0) = ${slot}\n`);
console.log('Done. On the Portaldot V3 testnet the same flow uses the same contract; it needs the');
console.log('testnet wallet funded with ~71 tPOT for the code deposit:');
console.log('  node scripts/deploy-any.mjs PlaqueV2 && node scripts/claim-plaque.mjs ...');
process.exit(process.exitCode ?? 0);
